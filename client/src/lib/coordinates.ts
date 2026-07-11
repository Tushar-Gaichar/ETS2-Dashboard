import proj4 from "proj4";

/**
 * Converts ETS2/ATS in-game world coordinates (from Funbit telemetry:
 * `telemetryData.truck.placement.x` / `.z`) into lng/lat coordinates that
 * MapLibre GL can plot directly.
 *
 * BACKGROUND — why this isn't a simple linear stretch:
 * An earlier version of this file fit a straight-line (affine) transform
 * between game meters and lng/lat using two known points. That worked
 * reasonably close to those two points, but broke down elsewhere on the
 * map (confirmed: truck position was clearly off near Saint Petersburg,
 * despite fitting exactly at the two calibration points) — because
 * longitude/latitude degrees don't correspond to equal real-world
 * distances everywhere, so a straight-line fit in raw lng/lat space is
 * fundamentally the wrong shape for a map this large.
 *
 * The actual fix: SCS's own map data is projected using a real
 * cartographic projection — Lambert Conformal Conic (LCC) — not a flat
 * stretch. This was confirmed by inspecting Rares Muntean's TruckNav-Sim
 * (github.com/Rares-Muntean/TruckNav-Sim), which reverse-engineered the
 * same projection truckermudgeon/maps' generator uses.
 *
 * The offset/scale constants below are OUR OWN refit, calibrated across
 * four attempts:
 *   1. Real-world GPS coordinates — wrong, SCS's map is fictional/compressed.
 *   2. Both cities' "city label" point in the tile data — better, but a
 *      city label is an arbitrary anchor, not a real location. Confirmed:
 *      Saint Petersburg's city label was ~56km from a precise POI a few km
 *      away in-game; Algeciras' city label was ~24km off similarly.
 *   3. One precise POI (gas station) + one city label — still one weak leg.
 *   4. FINAL: two precise POIs (gas stations, parked-at-exactly), on
 *      opposite ends of the map — Spain and Saint Petersburg. Notably, this
 *      converges to within ~0.001% of TruckNav-Sim's own published
 *      constants, which is strong independent confirmation the projection
 *      itself was always correct — every prior inaccuracy traced back to
 *      imprecise anchor points, not the math.
 */

// Lambert Conformal Conic projection SCS uses for the ETS2 world.
const ETS2_PROJ_DEF = "+proj=lcc +lat_1=37 +lat_2=65 +lat_0=50 +lon_0=15 +R=6370997";
const EARTH_RADIUS = 6370997;
const DEG_LEN = (EARTH_RADIUS * Math.PI) / 180;
const ets2Converter = proj4(ETS2_PROJ_DEF);

// Refit from two precise POI anchors (gas stations, parked-at-exactly) on
// opposite ends of the map — Spain and Saint Petersburg. See REFIT NOTE
// below for how these were derived and how to add a third point if a
// specific region still seems off.
const MAP_OFFSET: [number, number] = [16659.1133556184, 4149.481539266287];
const MAP_FACTOR: [number, number] = [-0.00017157117244535409, 0.0001729271678463649]; // [z-axis, x-axis]

// SCS scales the UK/Calais DLC area differently from mainland Europe — this
// is a known quirk of ETS2, not a mistake. Carried over as-is from
// TruckNav-Sim since neither of our calibration points falls in this area,
// so we have no data of our own to refit it against. If trucks in the UK
// specifically seem off, this box/scale is the first thing to revisit.
const UK_SCALE = 0.75;
const CALAIS_BOUND: [number, number] = [-31100, -5500];

/**
 * Converts game world (x, z) meters into [lng, lat] for MapLibre, via the
 * real LCC projection SCS's map data actually uses.
 */
export function gameToLngLat(x: number, z: number): [number, number] {
  let shiftedX = x - MAP_OFFSET[0];
  let shiftedZ = z - MAP_OFFSET[1];

  if (x < CALAIS_BOUND[0] && z < CALAIS_BOUND[1]) {
    shiftedX = (shiftedX + CALAIS_BOUND[0] / 2) * UK_SCALE;
    shiftedZ = (shiftedZ + CALAIS_BOUND[1] / 2) * UK_SCALE;
  }

  const projectedX = shiftedX * MAP_FACTOR[1] * DEG_LEN;
  const projectedY = shiftedZ * MAP_FACTOR[0] * DEG_LEN;

  const [lng, lat] = ets2Converter.inverse([projectedX, projectedY]);
  return [lng, lat];
}

/**
 * ETS2/ATS heading is 0–1, where 0 = north, 0.25 = west, 0.5 = south,
 * 0.75 = east (counter-clockwise). CSS `rotate()` on an upward-pointing
 * icon rotates clockwise, so we convert to a clockwise compass bearing.
 */
export function headingToDegrees(heading: number): number {
  const normalized = ((heading % 1) + 1) % 1;
  return (360 - normalized * 360) % 360;
}

/*
 * REFIT NOTE — how MAP_OFFSET/MAP_FACTOR above were derived, and how to add
 * a third point if needed later:
 *
 * 1. Forward-project each known real-world (lng, lat) target into the LCC's
 *    own planar space: const [px, py] = ets2Converter.forward([lng, lat]);
 * 2. That planar space relates to game coordinates as a straight line:
 *    projectedX = MAP_FACTOR[1] * DEG_LEN * gameX - MAP_FACTOR[1] * DEG_LEN * MAP_OFFSET[0]
 *    (and the same shape for Z/lat) — fit that line from 2+ known points.
 * 3. This is a legitimately correct space to do a linear fit in (unlike
 *    fitting directly in lng/lat), since the LCC projection itself already
 *    accounts for the curvature distortion.
 */