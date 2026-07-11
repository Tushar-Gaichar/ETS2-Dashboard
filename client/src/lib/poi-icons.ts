import type maplibregl from "maplibre-gl";

/**
 * Real map icons, sourced from truckermudgeon/maps' demo app
 * (packages/apps/demo/public/map-icons) — these are the actual small flat
 * icon assets their own map viewer uses, not hand-drawn approximations.
 * Copied into this project at client/public/map-icons/, renamed to match
 * our `poiType` values directly:
 *
 *   poiType    source file (in truckermudgeon/maps)
 *   --------   --------------------------------------
 *   company    companies_ico.png
 *   facility   service_ico.png
 *   ferry      port_overlay.png
 *   landmark   photo_sight_captured.png
 *   road       border_ico.png
 *   train      train_ico.png
 *   viewpoint  viewpoint.png
 *
 * Note on provenance: these icon PNGs originate from the ETS2/ATS games
 * themselves (SCS Software's in-game HUD/map icons), bundled into
 * truckermudgeon/maps' GPL-3.0 repo. Fine for a personal project like this
 * one; worth revisiting if this dashboard is ever distributed/published
 * publicly, since the icons' own rights sit with SCS Software regardless of
 * the repo's license.
 */

const POI_ICON_FILES: Record<string, string> = {
  company: "/map-icons/poi-company.png",
  facility: "/map-icons/poi-facility.png",
  ferry: "/map-icons/poi-ferry.png",
  landmark: "/map-icons/poi-landmark.png",
  road: "/map-icons/poi-road.png",
  train: "/map-icons/poi-train.png",
  viewpoint: "/map-icons/poi-viewpoint.png",
};

export const POI_ICON_IDS = Object.keys(POI_ICON_FILES);

/** Icon image ids as registered on the map, e.g. "poi-company", "poi-ferry". */
export function poiIconImageId(poiType: string): string {
  return `poi-${poiType}`;
}

/**
 * Registers all category icons as map images. Safe to call multiple times —
 * skips any icon already registered. Call this after the map's `load` event
 * (and again after any full style swap, since addImage is tied to the style).
 */
export async function loadPoiIcons(map: maplibregl.Map) {
  await Promise.all(
    POI_ICON_IDS.map(async (poiType) => {
      const imageId = poiIconImageId(poiType);
      if (map.hasImage(imageId)) return;

      const { data } = await map.loadImage(POI_ICON_FILES[poiType]);
      if (!map.hasImage(imageId)) map.addImage(imageId, data);
    }),
  );
}
