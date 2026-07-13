import proj4 from "proj4";

/**
 * Deliberately SEPARATE from ../coordinates.ts. That file's constants are
 * refit specifically to OUR generated ets2.pmtiles, for placing the live
 * truck marker. This file uses TruckNav-Sim's own ORIGINAL published
 * constants, unmodified — because graph.bin/geometry.bin (their routing
 * data, which we're reusing as-is) were built against those exact numbers.
 * Mixing the two coordinate spaces would silently corrupt distance/ETA math
 * even though nothing would visibly crash.
 *
 * Ported from TruckNav-Sim (github.com/Rares-Muntean/TruckNav-Sim) — GPL-3.0.
 */

const EARTH_RADIUS = 6370997;
const DEG_LEN = (EARTH_RADIUS * Math.PI) / 180;
const ETS2_PROJ_DEF = "+proj=lcc +lat_1=37 +lat_2=65 +lat_0=50 +lon_0=15 +R=6370997";
const ETS2_MAP_OFFSET: [number, number] = [16660, 4150];
const ETS2_MAP_FACTOR: [number, number] = [-0.000171570875, 0.0001729241463];
const ets2Converter = proj4(ETS2_PROJ_DEF);

/** lng/lat -> ETS2 game (x, z) meters, using TruckNav-Sim's own constants. */
export function routeGeoToGame(lng: number, lat: number): [number, number] {
  const [projX, projY] = ets2Converter.forward([lng, lat]);
  const x = projX / (ETS2_MAP_FACTOR[1] * DEG_LEN) + ETS2_MAP_OFFSET[0];
  const z = projY / (ETS2_MAP_FACTOR[0] * DEG_LEN) + ETS2_MAP_OFFSET[1];
  return [x, z];
}

/**
 * ETS2 game (x, z) meters -> lng/lat, using TruckNav-Sim's own constants.
 * Needed for cities.json, which stores raw game coordinates rather than
 * lng/lat (companies.geojson, by contrast, is already lng/lat).
 */
export function routeGameToGeo(x: number, z: number): [number, number] {
  let shiftedX = x - ETS2_MAP_OFFSET[0];
  let shiftedZ = z - ETS2_MAP_OFFSET[1];

  // SCS scales the UK/Calais DLC area differently — same quirk as our main
  // coordinates.ts carries over from TruckNav-Sim's original implementation.
  if (x < -31100 && z < -5500) {
    const ukScale = 0.75;
    shiftedX = (shiftedX + -31100 / 2) * ukScale;
    shiftedZ = (shiftedZ + -5500 / 2) * ukScale;
  }

  const projectedX = shiftedX * ETS2_MAP_FACTOR[1] * DEG_LEN;
  const projectedY = shiftedZ * ETS2_MAP_FACTOR[0] * DEG_LEN;
  const [lng, lat] = ets2Converter.inverse([projectedX, projectedY]);
  return [lng, lat];
}
