import { Protocol } from "pmtiles";
import maplibregl from "maplibre-gl";

/**
 * Registers the `pmtiles://` protocol with MapLibre GL so it can read tiles
 * directly out of a single .pmtiles file over HTTP range requests, instead
 * of needing a real tile server.
 *
 * This is a MODULE-LEVEL side effect on purpose: `MapPage` mounts/unmounts
 * every time you navigate to/away from /map (wouter unmounts route
 * components). Registering the protocol inside a component's useEffect
 * would mean re-registering (harmless but wasteful) on every visit, and
 * removing it on unmount could break tiles that are still mid-fetch during
 * a fast navigate-away. Importing this file once for its side effect keeps
 * the registration alive for the lifetime of the app.
 */
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);
