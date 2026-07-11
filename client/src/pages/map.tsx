import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibre-protocol"; // registers the pmtiles:// protocol — side-effect import, keep it above other maplibre usage
import { LocateFixed, Gauge } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { gameToLngLat, headingToDegrees } from "@/lib/coordinates";
import { createTruckMarkerElement } from "@/components/truck-marker";
import { loadPoiIcons, poiIconImageId } from "@/lib/poi-icons";
import { registerSpriteIconLoader } from "@/lib/sprite-icons";
import { snapToNearestRoad } from "@/lib/road-snap";
import { createSmoothedMarkerMover } from "@/lib/smoothed-marker";
import BottomNavigation from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";

// Your real ETS2 map data, served as a static file. Place the .pmtiles file
// at client/public/tiles/ets2.pmtiles — Vite serves client/public/ as-is in
// dev, and merges it into dist/public for production, which your Express
// server already serves via express.static(). No backend route needed.
const PMTILES_URL = "pmtiles:///tiles/ets2.pmtiles";
const FOOTPRINTS_PMTILES_URL = "pmtiles:///tiles/ets2-footprints.pmtiles";

// Real schema, confirmed via pmtiles.io inspection of ets2.pmtiles metadata:
// ONE source-layer named "ets2" containing all geometry. Features are told
// apart by `type`: city, country, ferry, mapArea, poi, prefab, road, traffic,
// train. Roads additionally have `roadType`: divided, freeway, local, train.
// POIs additionally have `poiType`: company, facility, ferry, landmark, road,
// train, viewpoint.
//
// Palette mirrors Apple Maps' actual Dark Mode: near-black land, barely-
// lighter building footprints, muted grey roads (not white — white roads on
// dark is more of a Google Maps look).
const style: maplibregl.StyleSpecification = {
  version: 8,
  // REQUIRED for any text-field to render at all — without this, every
  // label/shield layer below would silently render nothing (no error, just
  // invisible text, exactly the kind of quiet failure we've hit before).
  // This is MapLibre's own official public glyph server.
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    ets2: {
      type: "vector",
      url: PMTILES_URL,
      // Your new ets2.pmtiles was built with tippecanoe -z16 (up from -z13),
      // so tiles now exist up to z16. VERIFY this against pmtiles.io's "view
      // metadata" for your new file before trusting it — getting this wrong
      // caused the missing-regions/jagged-roads bug before.
      minzoom: 4,
      maxzoom: 16,
    },
    footprints: {
      type: "vector",
      url: FOOTPRINTS_PMTILES_URL,
      // Confirmed via `pmtiles show ets2-footprints.pmtiles --metadata`.
      minzoom: 4,
      maxzoom: 16,
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#1c1c1e" } },
    {
      id: "prefabs",
      type: "fill",
      source: "ets2",
      "source-layer": "ets2",
      filter: ["==", ["get", "type"], "prefab"],
      paint: { "fill-color": "#2c2c2e", "fill-opacity": 0.9 },
    },
    {
      // Real city building footprints (separate ets2-footprints.pmtiles),
      // extruded by their actual `height` field — gives the tilted, 3D
      // building look from truckermudgeon's own demo when you pitch the
      // camera (two-finger drag / right-click-drag). Flat top-down, it just
      // reads as slightly-raised building blocks, which is fine too.
      id: "footprints",
      type: "fill-extrusion",
      source: "footprints",
      "source-layer": "footprints",
      minzoom: 12, // full building-level detail only makes sense zoomed in
      paint: {
        "fill-extrusion-color": "#3a3a3c",
        "fill-extrusion-height": ["max", 0, ["to-number", ["get", "height"], 0]],
        "fill-extrusion-opacity": 0.9,
      },
    },
    {
      id: "roads",
      type: "line",
      source: "ets2",
      "source-layer": "ets2",
      filter: ["==", ["get", "type"], "road"],
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        // Freeways/divided roads a touch brighter and thicker than local
        // roads, giving a rough Apple-Maps-style road hierarchy.
        "line-color": [
          "match",
          ["get", "roadType"],
          "freeway", "#7a7a80",
          "divided", "#6a6a70",
          "#5a5a5e", // local / train / fallback
        ],
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          6, ["match", ["get", "roadType"], "freeway", 1, 0.4],
          12, ["match", ["get", "roadType"], "freeway", 3, "divided", 2, 1.2],
          16, ["match", ["get", "roadType"], "freeway", 8, "divided", 5, 3],
        ],
      },
    },
    {
      // Real route-shield icons (e.g. at_a1.png for Austria's A1), matched
      // directly via the `sprite` property — much better than deriving text
      // from the sprite string like before.
      id: "road-shields",
      type: "symbol",
      source: "ets2",
      "source-layer": "ets2",
      filter: [
        "all",
        ["==", ["get", "type"], "road"],
        ["in", ["get", "roadType"], ["literal", ["freeway", "divided"]]],
        ["!=", ["get", "sprite"], ""], // "has" alone lets empty-string sprites through, which have no icon to show
      ],
      minzoom: 5,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 300,
        "icon-image": ["get", "sprite"],
        "icon-size": 0.7,
        "icon-rotation-alignment": "viewport",
        "icon-pitch-alignment": "viewport",
        // Without these, road shields quietly lose the collision fight
        // against city/country labels sharing the same screen space and
        // just never render — this is very likely why they were "missing"
        // even after the icons themselves loaded correctly.
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    },
    {
      id: "country-labels",
      type: "symbol",
      source: "ets2",
      "source-layer": "ets2",
      filter: ["==", ["get", "type"], "country"],
      maxzoom: 6,
      layout: {
        "text-field": ["upcase", ["get", "name"]],
        "text-size": 13,
        "text-letter-spacing": 0.15,
        "text-font": ["Open Sans Bold"],
      },
      paint: {
        "text-color": "#8e8e93",
        "text-halo-color": "#1c1c1e",
        "text-halo-width": 1.5,
      },
    },
    {
      id: "city-dots",
      type: "circle",
      source: "ets2",
      "source-layer": "ets2",
      filter: ["==", ["get", "type"], "city"],
      minzoom: 5,
      paint: {
        "circle-radius": 2.5,
        "circle-color": "#d1d1d6",
      },
    },
    {
      id: "city-labels",
      type: "symbol",
      source: "ets2",
      "source-layer": "ets2",
      filter: ["==", ["get", "type"], "city"],
      minzoom: 5,
      layout: {
        "text-field": ["get", "name"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 10, 14],
        "text-offset": [0, 0.8],
        "text-anchor": "top",
        "symbol-sort-key": ["get", "scaleRank"], // lower scaleRank = more important = wins label collisions first
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#1c1c1e",
        "text-halo-width": 1.2,
      },
    },
    {
      // Prefers the real per-company/landmark icon (matched via `sprite`,
      // e.g. "polar_fish" -> polar_fish.png); falls back to the generic
      // category icon (poi-company, poi-ferry, etc.) if that specific
      // sprite has no generated art. `coalesce` + `image` is MapLibre's
      // built-in pattern for exactly this kind of icon fallback chain.
      id: "poi-icons",
      type: "symbol",
      source: "ets2",
      "source-layer": "ets2",
      filter: ["==", ["get", "type"], "poi"],
      minzoom: 12,
      layout: {
        "icon-image": [
          "coalesce",
          ["image", ["get", "sprite"]],
          ["image", [
            "match", ["get", "poiType"],
            "company", poiIconImageId("company"),
            "facility", poiIconImageId("facility"),
            "ferry", poiIconImageId("ferry"),
            "landmark", poiIconImageId("landmark"),
            "road", poiIconImageId("road"),
            "train", poiIconImageId("train"),
            "viewpoint", poiIconImageId("viewpoint"),
            poiIconImageId("company"),
          ]],
        ],
        "icon-size": 0.5,
        "icon-allow-overlap": true,
      },
    },
  ],
};

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const moverRef = useRef<ReturnType<typeof createSmoothedMarkerMover> | null>(null);
  const [followTruck, setFollowTruck] = useState(true);

  const { telemetryData } = useWebSocket();

  // Initialize the map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style,
      center: [10, 50],
      zoom: 4,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    registerSpriteIconLoader(map);

    map.on("load", () => {
      loadPoiIcons(map).catch((err) => console.error("Failed to load POI icons", err));
    });

    const markerEl = createTruckMarkerElement();
    const marker = new maplibregl.Marker({ element: markerEl, rotationAlignment: "map" })
      .setLngLat([10, 50])
      .addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    moverRef.current = createSmoothedMarkerMover(marker);

    // User panning manually should disengage auto-follow, like Apple Maps.
    map.on("dragstart", () => setFollowTruck(false));

    return () => {
      moverRef.current?.stop();
      moverRef.current = null;
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Push new telemetry into the marker + camera.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const mover = moverRef.current;
    if (!map || !marker || !mover || !telemetryData?.truck?.placement) return;

    const { x, z, heading } = telemetryData.truck.placement;
    const [lng, lat] = gameToLngLat(x, z);
    const bearingDeg = headingToDegrees(heading);

    // A single malformed/transient telemetry packet (Funbit does send these
    // occasionally, e.g. around pause/menu screens) producing NaN here would
    // otherwise throw inside MapLibre's easeTo — uncaught, that crashes the
    // whole React tree to a blank white screen. Skip this tick instead.
    if (![lng, lat, bearingDeg].every(Number.isFinite)) return;

    // Snap onto the nearest road to absorb residual calibration error, then
    // animate the marker smoothly toward it instead of jumping — telemetry
    // arrives in discrete ticks, and setting position directly every tick
    // is what caused the jittery/teleporting look.
    const snapped = snapToNearestRoad(map, [lng, lat]);
    mover.moveTo(snapped, bearingDeg, 300);

    if (followTruck) {
      // Rotating the camera bearing to match heading — not just re-centering
      // position — is what actually gives the Google-Maps-style "always
      // pointing up" navigation feel.
      map.easeTo({ center: snapped, bearing: bearingDeg, duration: 400 });
    }
  }, [telemetryData, followTruck]);

  const handleRecenter = () => {
    const map = mapRef.current;
    const placement = telemetryData?.truck?.placement;
    if (!map || !placement) return;
    const [lng, lat] = gameToLngLat(placement.x, placement.z);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    const snapped = snapToNearestRoad(map, [lng, lat]);
    setFollowTruck(true);
    map.easeTo({ center: snapped, zoom: 14, duration: 500 });
  };

  const speed = Math.round(telemetryData?.truck?.speed ?? 0);
  const connected = !!telemetryData?.game?.connected;

  return (
    <div className="ets2-map relative h-screen w-screen overflow-hidden bg-[#1c1c1e]">
      {/* Dark-theme override for MapLibre's built-in zoom/compass/fullscreen
          controls — they ship styled for a light map by default. */}
      <style>{`
        .ets2-map .maplibregl-ctrl-group {
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .ets2-map .maplibregl-ctrl-group button {
          background-color: transparent;
        }
        .ets2-map .maplibregl-ctrl-group button + button {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .ets2-map .maplibregl-ctrl-icon {
          filter: invert(1);
        }
        .ets2-map .maplibregl-ctrl-group button:hover {
          background-color: rgba(255, 255, 255, 0.08);
        }
      `}</style>

      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Recenter button + info card, stacked in one flex column so the
          button can never overlap the card regardless of how tall the card
          renders (the old version guessed a fixed pixel offset for the
          button, which broke as soon as the card's real height differed). */}
      <div className="absolute bottom-16 left-0 right-0 z-10 flex flex-col gap-3 px-3 pb-3">
        <Button
          size="icon"
          onClick={handleRecenter}
          className={`h-11 w-11 self-end rounded-full border border-white/10 shadow-lg backdrop-blur-md ${
            followTruck ? "bg-primary text-primary-foreground" : "bg-black/60 text-white hover:bg-black/70"
          }`}
        >
          <LocateFixed className="h-5 w-5" />
        </Button>

        <div className="rounded-3xl border border-white/10 bg-black/60 p-5 shadow-2xl backdrop-blur-md">
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-destructive"}`}
            />
            <span className="text-xs font-medium text-neutral-400">
              {connected ? "Live telemetry" : "Not connected"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold text-white">{speed} km/h</div>
              <div className="text-sm text-neutral-400">Current speed</div>
            </div>
            <Gauge className="h-8 w-8 text-neutral-600" />
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
