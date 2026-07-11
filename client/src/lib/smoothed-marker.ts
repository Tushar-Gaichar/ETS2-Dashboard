import type maplibregl from "maplibre-gl";

/**
 * Animates a MapLibre Marker smoothly toward each new position/bearing
 * instead of snapping instantly (`marker.setLngLat()` has no built-in
 * animation). Telemetry arrives in discrete, sometimes-irregular ticks —
 * without this, the marker visibly jitters/teleports on every update.
 *
 * Each call to `moveTo` starts a fresh interpolation from wherever the
 * marker CURRENTLY is (not from the previous target), so a new telemetry
 * tick arriving mid-animation doesn't cause a visible snap-back.
 */
export function createSmoothedMarkerMover(marker: maplibregl.Marker) {
  let rafId: number | null = null;
  let animStart = 0;
  let animDuration = 300;
  let fromLngLat: [number, number] = [0, 0];
  let toLngLat: [number, number] = [0, 0];
  let fromBearing = 0;
  let toBearing = 0;

  function tick(now: number) {
    const t = Math.min(1, (now - animStart) / animDuration);
    const eased = 1 - (1 - t) * (1 - t); // ease-out — feels smoother than linear for this

    const lng = fromLngLat[0] + (toLngLat[0] - fromLngLat[0]) * eased;
    const lat = fromLngLat[1] + (toLngLat[1] - fromLngLat[1]) * eased;
    marker.setLngLat([lng, lat]);

    // Shortest-arc bearing interpolation, so crossing the 0/360 boundary
    // (e.g. 350deg -> 10deg) spins the short way instead of all the way around.
    const bearingDelta = ((toBearing - fromBearing + 540) % 360) - 180;
    marker.setRotation(fromBearing + bearingDelta * eased);

    rafId = t < 1 ? requestAnimationFrame(tick) : null;
  }

  return {
    /** Start animating toward a new target position/bearing, from wherever the marker is right now. */
    moveTo(lngLat: [number, number], bearingDeg: number, duration = 300) {
      const current = marker.getLngLat();
      fromLngLat = [current.lng, current.lat];
      fromBearing = marker.getRotation();
      toLngLat = lngLat;
      toBearing = bearingDeg;
      animDuration = duration;
      animStart = performance.now();

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    },
    /** Stop any in-flight animation — call on unmount. */
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}
