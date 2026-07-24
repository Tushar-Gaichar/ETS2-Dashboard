import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibre-protocol"; // registers the pmtiles:// protocol — side-effect import, keep it above other maplibre usage
import { LocateFixed } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { gameToLngLat, headingToDegrees } from "@/lib/coordinates";
import { createTruckMarkerElement } from "@/components/truck-marker";
import { loadPoiIcons, poiIconImageId } from "@/lib/poi-icons";
import { registerSpriteIconLoader } from "@/lib/sprite-icons";
import { snapToNearestRoad } from "@/lib/road-snap";
import { createSmoothedMarkerMover } from "@/lib/smoothed-marker";
import { createRoutingClient, type RouteResult } from "@/lib/routing/routing-client";
import { resolveJobDestination } from "@/lib/routing/city-lookup";
import BottomNavigation from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Navigation, X } from "lucide-react";

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
    route: {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }, // populated live via map.getSource("route").setData(...)
    },
    // EXPERIMENTAL — TruckNav-Sim's own road geometry, being tried as the
    // base road-line layer since it's generated from the exact same
    // pipeline run as the routing graph (graph.bin/geometry.bin), so it
    // should line up with computed routes better than our own separately-
    // generated ets2.pmtiles does. Real tradeoff: zero properties (no
    // roadType, no sprite), capped at zoom 9 (vs our 16). See the "roads"
    // layer below — easy to revert by pointing it back at "ets2"/"ets2".
    trucknavRoads: {
      type: "vector",
      url: "pmtiles:///tiles/trucknav-roads.pmtiles",
      minzoom: 5,
      maxzoom: 9,
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
        // Multiplied for visual impact — real map apps (Apple/Google Maps
        // included) exaggerate building height rather than rendering true
        // scale, since true-scale buildings read as flat at typical camera
        // pitch. Tune the multiplier further to taste.
        "fill-extrusion-height": ["*", ["max", 0, ["to-number", ["get", "height"], 0]], 2.5],
        "fill-extrusion-opacity": 0.9,
      },
    },
    {
      // EXPERIMENTAL — see the trucknavRoads source comment above. To
      // revert: change source/"source-layer" back to "ets2"/"ets2", restore
      // the filter, and bring back the roadType-based color/width matches
      // (git history / the previous version of this file has the exact
      // code — this is a straight swap, nothing else depends on it changing).
      id: "roads",
      type: "line",
      source: "trucknavRoads",
      "source-layer": "ets2",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        // No roadType property on this source, so no freeway/local
        // hierarchy — flat width/color for everything until/unless we
        // bring that styling back from our own data.
        "line-color": "#6a6a70",
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 12, 2.5, 16, 6],
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
      // Painted here (after roads, before labels/POIs) so it's clearly
      // visible on top of the road network without covering place names or
      // POI icons. Was mistakenly placed before "roads" originally, which
      // let roads paint over parts of the route line.
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#0a84ff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2, 12, 4, 16, 7],
        "line-opacity": 0.85,
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
  const routingRef = useRef<ReturnType<typeof createRoutingClient> | null>(null);
  const [followTruck, setFollowTruck] = useState(true);
  const [clickToRouteEnabled, setClickToRouteEnabled] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [showDevNotice, setShowDevNotice] = useState(true);
  const clickToRouteEnabledRef = useRef(clickToRouteEnabled);
  clickToRouteEnabledRef.current = clickToRouteEnabled;

  const { telemetryData } = useWebSocket();
  const telemetryDataRef = useRef(telemetryData);
  telemetryDataRef.current = telemetryData;

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

    const routing = createRoutingClient();
    routingRef.current = routing;
    routing.ready.catch((err) => console.error("Routing graph failed to load", err));

    // User panning manually should disengage auto-follow, like Apple Maps.
    map.on("dragstart", () => setFollowTruck(false));

    map.on("click", async (e) => {
      if (!clickToRouteEnabledRef.current) return;
      const placement = telemetryDataRef.current?.truck?.placement;
      if (!placement || !routingRef.current) return;

      const [startLng, startLat] = gameToLngLat(placement.x, placement.z);
      if (!Number.isFinite(startLng) || !Number.isFinite(startLat)) return;
      const start = snapToNearestRoad(map, [startLng, startLat]);
      const headingDeg = headingToDegrees(placement.heading);

      setRouting(true);
      try {
        await routingRef.current.ready;
        const result = await routingRef.current.findRoute(
          start,
          Number.isFinite(headingDeg) ? headingDeg : null,
          [e.lngLat.lng, e.lngLat.lat],
        );
        setRouteResult(result);
        const source = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
        source?.setData({
          type: "FeatureCollection",
          features: result
            ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: result.path } }]
            : [],
        });
      } catch (err) {
        console.error("Routing failed", err);
        setRouteResult(null);
      } finally {
        setRouting(false);
      }
    });

    return () => {
      moverRef.current?.stop();
      moverRef.current = null;
      routingRef.current?.destroy();
      routingRef.current = null;
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

  // Auto-route to the active job's destination. Keyed on the destination
  // identity (not telemetryData itself, which changes every tick) so this
  // only re-runs when the job actually changes, not on every position update.
  const jobDestinationKey = `${telemetryData?.job?.destinationCity ?? ""}|${telemetryData?.job?.destinationCompany ?? ""}`;
  useEffect(() => {
    const map = mapRef.current;
    const routing = routingRef.current;
    const destinationCity = telemetryData?.job?.destinationCity;
    const destinationCompany = telemetryData?.job?.destinationCompany;
    const placement = telemetryData?.truck?.placement;

    if (!map || !routing || !placement || (!destinationCity && !destinationCompany)) return;

    let cancelled = false;
    (async () => {
      const destination = await resolveJobDestination(
        destinationCity,
        destinationCompany,
        telemetryData?.job?.destinationCityId,
      );
      if (!destination || cancelled) return;

      const [startLng, startLat] = gameToLngLat(placement.x, placement.z);
      if (!Number.isFinite(startLng) || !Number.isFinite(startLat)) return;
      const start = snapToNearestRoad(map, [startLng, startLat]);
      const headingDeg = headingToDegrees(placement.heading);

      setRouting(true);
      try {
        await routing.ready;
        const result = await routing.findRoute(start, Number.isFinite(headingDeg) ? headingDeg : null, destination);
        if (cancelled) return;
        setRouteResult(result);
        const source = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
        source?.setData({
          type: "FeatureCollection",
          features: result
            ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: result.path } }]
            : [],
        });
      } catch (err) {
        console.error("Job auto-routing failed", err);
      } finally {
        if (!cancelled) setRouting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobDestinationKey]);

  function clearRoute() {
    setRouteResult(null);
    const map = mapRef.current;
    const source = map?.getSource("route") as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features: [] });
  }

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
  const speedLimit = Math.round(telemetryData?.navigation?.speedLimit ?? 0);
  const speedLimitWarning = !!telemetryData?.navigation?.speedLimitWarning;

  return (
    <div className="ets2-map relative h-dvh w-full overflow-hidden bg-[#1c1c1e]">
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
        @keyframes speed-warning-flash {
          0%, 100% { background-color: hsl(var(--destructive)); }
          50% { background-color: #1c1c1e; }
        }
        .speed-warning-flash {
          animation: speed-warning-flash 1s ease-in-out infinite;
        }
      `}</style>

      <div ref={mapContainerRef} className="absolute inset-0" />

      {showDevNotice && (
        <div className="absolute left-3 right-16 top-3 z-20">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/70 px-4 py-2.5 shadow-2xl backdrop-blur-md">
            <span className="text-sm text-neutral-200">Map is still under development</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowDevNotice(false)}
              className="h-6 w-6 shrink-0 text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Buttons, speed badge, and route bar all stacked in one flex column
          (in that order) so none of them can overlap regardless of how tall
          any of them render. The container itself is pointer-events-none —
          an absolutely-positioned full-width div still intercepts clicks
          for whatever's underneath even where nothing is visibly drawn,
          which is exactly what was swallowing taps on the Controls/Settings
          nav buttons in mobile landscape once this stack's height pushed it
          low enough to overlap the nav bar. Each real interactive piece
          below opts back in with pointer-events-auto. landscape: variants
          shrink everything a bit, since landscape phones have much less
          vertical room to work with. */}
      <div className="pointer-events-none absolute bottom-16 left-0 right-0 z-10 flex flex-col gap-3 px-3 pb-3 landscape:gap-2 landscape:pb-2">
        <div className="pointer-events-auto flex justify-end gap-2 self-end">
          <Button
            size="icon"
            onClick={() => setClickToRouteEnabled((v) => !v)}
            title="Tap the map to route there"
            className={`h-11 w-11 rounded-full border border-white/10 shadow-lg backdrop-blur-md landscape:h-9 landscape:w-9 ${
              clickToRouteEnabled ? "bg-primary text-primary-foreground" : "bg-black/60 text-white hover:bg-black/70"
            }`}
          >
            <Navigation className={`h-5 w-5 landscape:h-4 landscape:w-4 ${routing ? "animate-pulse" : ""}`} />
          </Button>
          <Button
            size="icon"
            onClick={handleRecenter}
            className={`h-11 w-11 rounded-full border border-white/10 shadow-lg backdrop-blur-md landscape:h-9 landscape:w-9 ${
              followTruck ? "bg-primary text-primary-foreground" : "bg-black/60 text-white hover:bg-black/70"
            }`}
          >
            <LocateFixed className="h-5 w-5 landscape:h-4 landscape:w-4" />
          </Button>
        </div>

        <div
          className={`pointer-events-auto flex h-20 w-20 flex-col items-center justify-center gap-0.5 self-start rounded-2xl border shadow-2xl backdrop-blur-md transition-colors landscape:h-14 landscape:w-14 ${
            speedLimitWarning ? "speed-warning-flash border-white/20" : "border-white/10 bg-black/60"
          }`}
        >
          <span className="text-sm font-medium leading-none text-white/70 landscape:text-xs">{speed}</span>
          {speedLimit > 0 && (
            <span className="text-3xl font-bold leading-none text-white landscape:text-2xl">{speedLimit}</span>
          )}
        </div>

        {routeResult && (
          <div className="pointer-events-auto flex items-center justify-between rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 shadow-2xl backdrop-blur-md landscape:px-3 landscape:py-1.5">
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-semibold text-white">{routeResult.distanceKm.toFixed(0)} km</span>
              <span className="text-sm text-neutral-400">
                ~{routeResult.etaHours >= 1
                  ? `${Math.floor(routeResult.etaHours)}h ${Math.round((routeResult.etaHours % 1) * 60)}m`
                  : `${Math.round(routeResult.etaHours * 60)}m`}
              </span>
            </div>
            <Button size="icon" variant="ghost" onClick={clearRoute} className="h-7 w-7 text-neutral-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}