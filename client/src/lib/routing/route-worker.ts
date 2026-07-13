import { loadRoutingGraph, type RoutingGraph } from "./graph-loader";
import { calculateRoute, simplifyPath, smoothPath, buildRouteStatsCache, type WorkerCityArea } from "./algorithm";

/**
 * Runs graph loading + A* pathfinding entirely inside this worker, off the
 * main thread — this is the CPU/memory-heavy part (346k+ directed edges).
 * Simpler than TruckNav-Sim's original split (they decode the graph on
 * both the main thread AND the worker, for their own UI reasons); here the
 * worker owns the whole graph, and the main thread just sends point
 * requests and gets back finished routes.
 */

let graph: RoutingGraph | null = null;
let cityAreas: WorkerCityArea[] = [];

type InMessage =
  | { type: "INIT" }
  | {
      type: "FIND_ROUTE";
      requestId: number;
      startPoint: [number, number];
      startHeadingDeg: number | null;
      endPoint: [number, number];
      avgSpeedKmh: number;
    };

self.onmessage = async (e: MessageEvent<InMessage>) => {
  const msg = e.data;

  if (msg.type === "INIT") {
    try {
      graph = await loadRoutingGraph();

      try {
        const citiesRes = await fetch("/routing-data/map-data/cities.json");
        const cities: Array<{ areas?: Array<{ x: number; y: number; width: number; height: number }> }> =
          await citiesRes.json();
        cityAreas = cities.flatMap(
          (city) =>
            city.areas?.map((a) => ({
              minX: a.x - a.width / 2,
              maxX: a.x + a.width / 2,
              minZ: a.y - a.height / 2,
              maxZ: a.y + a.height / 2,
            })) ?? [],
        );
      } catch {
        cityAreas = []; // city-speed detection just falls back to highway speed everywhere — non-fatal
      }

      self.postMessage({ type: "READY", nodeCount: graph.nodeCoords.size });
    } catch (err) {
      self.postMessage({ type: "ERROR", error: String(err) });
    }
    return;
  }

  if (msg.type === "FIND_ROUTE") {
    if (!graph) {
      self.postMessage({ type: "ROUTE_RESULT", requestId: msg.requestId, result: null, error: "Graph not loaded" });
      return;
    }

    const startCandidates = graph.getClosestNodes(msg.startPoint, 1);
    const endCandidates = graph.getClosestNodes(msg.endPoint, 3);

    if (startCandidates.length === 0 || endCandidates.length === 0) {
      self.postMessage({ type: "ROUTE_RESULT", requestId: msg.requestId, result: null, error: "No nearby road found" });
      return;
    }

    const result = calculateRoute(
      startCandidates[0]!,
      new Set(endCandidates),
      msg.startHeadingDeg,
      graph.adjacency,
      graph.nodeCoords,
      "road",
      [], // owned DLCs — empty means DLC-gated roads are treated as unavailable; see routing-client.ts notes
      msg.endPoint,
    );

    if (!result) {
      self.postMessage({ type: "ROUTE_RESULT", requestId: msg.requestId, result: null, error: "No route found" });
      return;
    }

    // Expand node-to-node hops into each edge's FULL polyline geometry —
    // without this, the path only has each intersection's coordinate, and
    // any edge spanning a long/curved stretch of road gets drawn as a
    // straight line cutting across it instead of following the actual road.
    // This step was missing from an earlier version of this file; ported
    // now from TruckNav-Sim's route.worker.ts, which does this expansion
    // before simplifying/smoothing, not after.
    const rawDisplayPath: [number, number][] = [];
    for (let i = 0; i < result.nodeSequence.length - 1; i++) {
      const u = result.nodeSequence[i]!;
      const v = result.nodeSequence[i + 1]!;
      const edge = graph.adjacency.get(u)?.find((e) => e.to === v);

      if (edge && edge.startIndex !== undefined) {
        for (let p = 0; p < edge.pointCount; p++) {
          const lng = graph.geometryF32[edge.startIndex + p * 2]!;
          const lat = graph.geometryF32[edge.startIndex + p * 2 + 1]!;
          const last = rawDisplayPath[rawDisplayPath.length - 1];
          if (last && last[0] === lng && last[1] === lat) continue; // dedupe edge-boundary point
          rawDisplayPath.push([lng, lat]);
        }
      } else {
        rawDisplayPath.push(result.path[i]!); // no edge geometry found — fall back to the node point itself
      }
    }
    rawDisplayPath.push(result.path[result.path.length - 1]!);

    const simplified = simplifyPath(rawDisplayPath, 0.00003);
    // 4 passes (TruckNav-Sim's own default) rounds off real turns/roundabouts
    // too aggressively — 2 keeps enough smoothing for a clean-looking line
    // without cutting corners at sharp turns. Tune further if it still looks
    // too smoothed (lower) or too jagged (higher).
    const smoothed = smoothPath(simplified, 2);
    const stats = buildRouteStatsCache(smoothed, cityAreas, msg.avgSpeedKmh);
    const totalKm = stats[stats.length - 2] ?? 0;
    const totalHours = stats[stats.length - 1] ?? 0;

    self.postMessage({
      type: "ROUTE_RESULT",
      requestId: msg.requestId,
      result: { path: smoothed, distanceKm: totalKm, etaHours: totalHours },
    });
  }
};
