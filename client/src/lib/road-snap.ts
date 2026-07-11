import type maplibregl from "maplibre-gl";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import { lineString as turfLineString, point as turfPoint } from "@turf/helpers";

// Don't snap onto a road if nothing is within this distance — this is what
// stops the marker getting yanked onto a nearby road while genuinely off-road
// (parked at a depot, in a company yard, etc.), and also stops it snapping
// somewhere wrong if our coordinate fit is off by more than this locally.
const MAX_SNAP_DISTANCE_METERS = 40;

// Screen-space search radius (px) around the truck's projected position —
// small and cheap, since we only care about roads immediately around it.
const SEARCH_RADIUS_PX = 40;

/**
 * Snaps a raw (lng, lat) onto the nearest currently-rendered road, if one is
 * close enough. This exists to visually absorb the residual few-meters/lane-
 * width error our coordinate fit still has (see coordinates.ts) — the same
 * trick real navigation apps use to keep a noisy/imperfect position glued to
 * the road you're actually on, rather than showing raw jitter.
 */
export function snapToNearestRoad(
  map: maplibregl.Map,
  lngLat: [number, number],
): [number, number] {
  const screenPoint = map.project(lngLat);
  const features = map.queryRenderedFeatures(
    [
      [screenPoint.x - SEARCH_RADIUS_PX, screenPoint.y - SEARCH_RADIUS_PX],
      [screenPoint.x + SEARCH_RADIUS_PX, screenPoint.y + SEARCH_RADIUS_PX],
    ],
    { layers: ["roads"] },
  );

  if (features.length === 0) return lngLat;

  const target = turfPoint(lngLat);
  let closestCoord: [number, number] | null = null;
  let closestDist = Infinity;

  for (const feature of features) {
    if (feature.geometry.type !== "LineString") continue;

    try {
      const line = turfLineString(feature.geometry.coordinates as [number, number][]);
      const snapped = nearestPointOnLine(line, target, { units: "meters" });
      const dist = snapped.properties.pointDistance;
      if (dist < closestDist) {
        closestDist = dist;
        closestCoord = snapped.geometry.coordinates as [number, number];
      }
    } catch {
      continue; // malformed/degenerate geometry — skip this feature
    }
  }

  if (closestCoord && closestDist <= MAX_SNAP_DISTANCE_METERS) {
    return closestCoord;
  }
  return lngLat;
}
