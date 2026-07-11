/**
 * Builds the DOM element used as a MapLibre GL `Marker`'s content.
 * Kept as a plain DOM factory (not a React component) because MapLibre's
 * Marker API wants an HTMLElement, not JSX — this mirrors how the rest of
 * the map integration talks to maplibre-gl directly.
 *
 * Rotation is NOT handled here — pass `rotationAlignment: "map"` to the
 * `Marker` constructor and call `marker.setRotation(bearingDeg)` instead.
 * MapLibre manages the element's transform internally for positioning;
 * setting `el.style.transform` manually here would fight with that.
 */
export function createTruckMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "36px";
  el.style.height = "36px";

  el.innerHTML = `
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="hsl(207, 90%, 54%)" fill-opacity="0.18" />
      <circle cx="18" cy="18" r="9" fill="hsl(207, 90%, 54%)" stroke="white" stroke-width="2.5" />
      <path d="M18 9 L23 20 L18 17 L13 20 Z" fill="white" />
    </svg>
  `;

  return el;
}
