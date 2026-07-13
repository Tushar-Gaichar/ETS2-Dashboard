import { MinHeap } from "./MinHeap";
import { routeGeoToGame } from "./route-geo";

/**
 * A* pathfinding over the directed edge graph decoded from graph.bin, plus
 * path post-processing (simplify/smooth) and distance/duration estimation.
 * Ported from TruckNav-Sim (github.com/Rares-Muntean/TruckNav-Sim) —
 * GPL-3.0 — and trimmed to ETS2-only (the original also supports ATS).
 */

export interface GraphEdge {
  to: number;
  weight: number;
  hIn: number;
  hOut: number;
  isFerry: boolean;
  requiredDlc: number;
  vPrefabId: number;
  startIndex: number;
  pointCount: number;
  maneuverType: number;
  exitNumber: number;
  edgeId?: number;
}

export interface WorkerCityArea {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Increased size to handle directed edges instead of nodes.
const MAX_EDGES = 4_000_000;

const cache_costs = new Float64Array(MAX_EDGES);
const cache_previous = new Int32Array(MAX_EDGES);
const cache_visited = new Uint8Array(MAX_EDGES);
const cache_is_ferry = new Uint8Array(MAX_EDGES);

const edge_target = new Int32Array(MAX_EDGES);
const edge_source = new Int32Array(MAX_EDGES);
const edge_hIn = new Float32Array(MAX_EDGES);

const openHeap = new MinHeap(50000);

let cache_flatCoords: Float64Array | null = null;
let isEdgesMapped = false;
let globalNextEdgeId = 0;

function ensureCoordCache(nodeCoords: Map<number, [number, number]>) {
  if (cache_flatCoords && cache_flatCoords.length > 0) return;
  cache_flatCoords = new Float64Array(900_000 * 2);
  nodeCoords.forEach(([lng, lat], id) => {
    if (id * 2 + 1 < cache_flatCoords!.length) {
      cache_flatCoords![id * 2] = lng;
      cache_flatCoords![id * 2 + 1] = lat;
    }
  });
}

function ensureEdgesMapped(adjacency: Map<number, GraphEdge[]>) {
  if (isEdgesMapped) return;
  globalNextEdgeId = 0;
  adjacency.forEach((edges, u) => {
    for (const edge of edges) {
      const eId = globalNextEdgeId++;
      edge.edgeId = eId;
      edge_target[eId] = edge.to;
      edge_source[eId] = u;
      edge_hIn[eId] = edge.hIn || 0;
    }
  });
  isEdgesMapped = true;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function getBearing(start: [number, number], end: [number, number]): number {
  const startLat = toRad(start[1]);
  const startLng = toRad(start[0]);
  const endLat = toRad(end[1]);
  const endLng = toRad(end[0]);
  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function getAngleDiff(angle1: number, angle2: number): number {
  const diff = Math.abs(angle1 - angle2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function getScaleMultiplier(
  gameX: number,
  gameZ: number,
  cityAreas: WorkerCityArea[] | null,
): number {
  let highwayScale = 19;
  if (gameX < -31100 && gameZ < -5500) highwayScale = 15; // UK/Calais quirk

  if (!cityAreas || cityAreas.length === 0) return highwayScale;
  for (const area of cityAreas) {
    if (gameX >= area.minX && gameX <= area.maxX && gameZ >= area.minZ && gameZ <= area.maxZ) {
      return 3;
    }
  }
  return highwayScale;
}

function fastDistKm(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const ky = 111.0;
  const kx = 111.0 * 0.65;
  const dy = (lat1 - lat2) * ky;
  const dx = (lng1 - lng2) * kx;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateRoute(
  start: number,
  possibleEnds: Set<number | undefined>,
  startHeading: number | null,
  adjacency: Map<number, GraphEdge[]>,
  nodeCoords: Map<number, [number, number]>,
  startType: "road" | "yard" = "road",
  ownedDlcs: number[],
  targetLocation?: [number, number],
): { path: [number, number][]; nodeSequence: number[]; endId: number } | null {
  ensureCoordCache(nodeCoords);
  ensureEdgesMapped(adjacency);
  const flatCoords = cache_flatCoords!;

  const START_EDGE_ID = globalNextEdgeId;
  cache_costs.fill(Infinity, 0, START_EDGE_ID + 1);
  cache_previous.fill(-1, 0, START_EDGE_ID + 1);
  cache_visited.fill(0, 0, START_EDGE_ID + 1);
  cache_is_ferry.fill(0, 0, START_EDGE_ID + 1);
  openHeap.clear();

  let destLng = 0;
  let destLat = 0;
  let foundDest = false;

  if (targetLocation) {
    [destLng, destLat] = targetLocation;
    foundDest = true;
  } else {
    const firstEndId = Array.from(possibleEnds)[0];
    if (firstEndId !== undefined) {
      destLng = flatCoords[firstEndId * 2]!;
      destLat = flatCoords[firstEndId * 2 + 1]!;
      foundDest = true;
    }
  }
  if (!foundDest) return null;

  const startLng = flatCoords[start * 2]!;
  const startLat = flatCoords[start * 2 + 1]!;
  const distKm = fastDistKm(startLng, startLat, destLng, destLat);
  const maxIterations = 70000 + distKm * 5000;

  const getHeuristic = (id: number) => {
    const nLng = flatCoords[id * 2]!;
    const nLat = flatCoords[id * 2 + 1]!;
    const dx = nLng - destLng;
    const dy = nLat - destLat;
    return Math.sqrt(dx * dx + dy * dy) * 100;
  };

  cache_costs[START_EDGE_ID] = 0;
  openHeap.push(START_EDGE_ID, 0);

  let foundEndEdgeId: number | null = null;
  let iterations = 0;

  while (openHeap.size() > 0) {
    iterations++;
    if (iterations > maxIterations) return null;

    const currentEdgeId = openHeap.pop();
    if (currentEdgeId === undefined) break;
    if (cache_visited[currentEdgeId] === 1) continue;
    cache_visited[currentEdgeId] = 1;

    const currentId = currentEdgeId === START_EDGE_ID ? start : edge_target[currentEdgeId]!;
    if (possibleEnds.has(currentId)) {
      foundEndEdgeId = currentEdgeId;
      break;
    }

    const currentArrivalHeading = currentEdgeId === START_EDGE_ID ? 0 : edge_hIn[currentEdgeId];
    const prevId = currentEdgeId === START_EDGE_ID ? -1 : edge_source[currentEdgeId];
    const currentG = cache_costs[currentEdgeId]!;

    const neighbors = adjacency.get(currentId);
    if (!neighbors) continue;

    const cLng = flatCoords[currentId * 2]!;
    const cLat = flatCoords[currentId * 2 + 1]!;
    const ferryGraceCounter = cache_is_ferry[currentEdgeId];

    for (const edge of neighbors) {
      const neighborEdgeId = edge.edgeId!;

      const dlcId = edge.requiredDlc || 0;
      // Empty ownedDlcs means "assume everything is owned" (no DLC-ownership
      // tracking in this project) rather than "exclude every DLC road" —
      // pass a real list here later if you want actual per-DLC filtering.
      if (dlcId !== 0 && ownedDlcs.length > 0 && !ownedDlcs.includes(dlcId)) continue;
      if (cache_visited[neighborEdgeId] === 1) continue;

      const neighborNodeId = edge.to;
      if (prevId !== -1 && neighborNodeId === prevId) continue;

      let stepCost = edge.weight || 1;

      if (!edge.isFerry && ferryGraceCounter === 0) {
        if (currentEdgeId === START_EDGE_ID && startHeading !== null) {
          const nLng = flatCoords[neighborNodeId * 2]!;
          const nLat = flatCoords[neighborNodeId * 2 + 1]!;
          const dir = getBearing([cLng, cLat], [nLng, nLat]);
          const diff = Math.abs(getAngleDiff(startHeading, dir));
          if (startType === "yard") {
            stepCost += 10;
            if (diff > 75) stepCost += 10_000_000;
            else if (diff > 45) stepCost += 1000;
          } else {
            if (diff > 75) stepCost += 10_000_000;
            else if (diff > 45) stepCost += 1000;
          }
        } else if (currentEdgeId !== START_EDGE_ID && edge.hOut !== undefined) {
          let diff = Math.abs(currentArrivalHeading! - edge.hOut);
          if (diff > Math.PI) diff = 2 * Math.PI - diff;

          if (edge.maneuverType === 3) {
            if (diff > 1.0) stepCost += 50;
          } else {
            if (diff > 2.8) stepCost += 100_000_000;
            else if (diff > 1.5) stepCost += 10_000;
            else if (diff > 1.0) stepCost += 1000;
            else if (diff > 0.4) stepCost += 500;
          }
        }
      }

      if (stepCost < 1) stepCost = 1;
      const tentativeG = currentG + stepCost;

      if (tentativeG < cache_costs[neighborEdgeId]!) {
        cache_previous[neighborEdgeId] = currentEdgeId;
        cache_costs[neighborEdgeId] = tentativeG;
        cache_is_ferry[neighborEdgeId] = edge.isFerry ? 5 : Math.max(0, ferryGraceCounter! - 1);
        openHeap.push(neighborEdgeId, tentativeG + getHeuristic(neighborNodeId));
      }
    }
  }

  if (foundEndEdgeId === null) return null;

  let path: [number, number][] = [];
  let nodeSequence: number[] = [];
  let currEdgeId: number = foundEndEdgeId;

  while (currEdgeId !== START_EDGE_ID && currEdgeId !== -1) {
    const cId = edge_target[currEdgeId]!;
    path.unshift([flatCoords[cId * 2]!, flatCoords[cId * 2 + 1]!]);
    nodeSequence.unshift(cId);
    currEdgeId = cache_previous[currEdgeId]!;
    if (path.length > 20000) break;
  }
  path.unshift([flatCoords[start * 2]!, flatCoords[start * 2 + 1]!]);
  nodeSequence.unshift(start);

  // Collapse any loop-back where the same node appears more than once —
  // e.g. circling a roundabout twice. Each edge is tracked as "visited"
  // independently of which node it leads to (deliberately, for heading-aware
  // routing), so the search can legitimately revisit a node via a different
  // edge if that scored cheaper — but a real truck never needs to physically
  // loop back through the same intersection, so any such loop is pointless
  // detour, not a required maneuver. Keep only the first visit to each node.
  const firstIndexOfNode = new Map<number, number>();
  for (let i = 0; i < nodeSequence.length; i++) {
    const nodeId = nodeSequence[i]!;
    if (!firstIndexOfNode.has(nodeId)) firstIndexOfNode.set(nodeId, i);
  }
  const hasLoop = firstIndexOfNode.size < nodeSequence.length;
  if (hasLoop) {
    const cleanedSequence: number[] = [];
    const cleanedPath: [number, number][] = [];
    let i = 0;
    while (i < nodeSequence.length) {
      const nodeId = nodeSequence[i]!;
      cleanedSequence.push(nodeId);
      cleanedPath.push(path[i]!);
      const lastOccurrence = nodeSequence.lastIndexOf(nodeId);
      i = lastOccurrence + 1; // jump straight past any loop back to this same node
    }
    nodeSequence = cleanedSequence;
    path = cleanedPath;
  }

  return { path, nodeSequence, endId: nodeSequence[nodeSequence.length - 1]! };
}

export function simplifyPath(points: [number, number][], epsilon = 0.000002): [number, number][] {
  if (points.length <= 2) return points;
  const sqEpsilon = epsilon * epsilon;

  const getSqDist = (p: [number, number], a: [number, number], b: [number, number]) => {
    let x = a[0];
    let y = a[1];
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b[0];
        y = b[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };

  const simplifyRecursive = (
    pts: [number, number][],
    start: number,
    end: number,
    result: [number, number][],
  ) => {
    let maxSqDist = sqEpsilon;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = getSqDist(pts[i]!, pts[start]!, pts[end]!);
      if (d > maxSqDist) {
        index = i;
        maxSqDist = d;
      }
    }
    if (index !== -1) {
      simplifyRecursive(pts, start, index, result);
      result.push(pts[index]!);
      simplifyRecursive(pts, index, end, result);
    }
  };

  const result = [points[0]!];
  simplifyRecursive(points, 0, points.length - 1, result);
  result.push(points[points.length - 1]!);
  return result;
}

export function smoothPath(path: [number, number][], iterations = 5): [number, number][] {
  if (path.length < 3) return path;
  let current = path;
  for (let it = 0; it < iterations; it++) {
    const smoothed: [number, number][] = [current[0]!];
    for (let i = 1; i < current.length - 1; i++) {
      const p = current[i - 1]!;
      const c = current[i]!;
      const n = current[i + 1]!;
      smoothed.push([p[0] * 0.25 + c[0] * 0.5 + n[0] * 0.25, p[1] * 0.25 + c[1] * 0.5 + n[1] * 0.25]);
    }
    smoothed.push(current[current.length - 1]!);
    current = smoothed;
  }
  return current;
}

/** [cumulativeKm, cumulativeHours] pairs, one per path point. */
export function buildRouteStatsCache(
  pathCoords: [number, number][],
  cities: WorkerCityArea[] | null,
  avgSpeed: number,
): Float32Array {
  const cache = new Float32Array(pathCoords.length * 2);

  const baseHighway = 82;
  const highwaySpeed = avgSpeed > 40 ? avgSpeed * 0.7 + baseHighway * 0.3 : baseHighway;
  const baseCity = 32;
  const citySpeed = avgSpeed > 40 ? avgSpeed * 0.4 + baseCity * 0.6 : baseCity;

  const gamePoints = pathCoords.map((p) => routeGeoToGame(p[0], p[1]));

  let totalKm = 0;
  let totalHours = 0;
  cache[0] = 0;
  cache[1] = 0;

  for (let i = 0; i < pathCoords.length - 1; i++) {
    const [x1, z1] = gamePoints[i]!;
    const [x2, z2] = gamePoints[i + 1]!;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const rawLength = Math.sqrt(dx * dx + dz * dz);

    const multiplier = getScaleMultiplier((x1 + x2) / 2, (z1 + z2) / 2, cities);
    const segmentKm = (rawLength * multiplier) / 1000;
    const segmentSpeed = multiplier === 3 ? citySpeed : highwaySpeed;

    totalKm += segmentKm;
    totalHours += segmentKm / segmentSpeed;

    const idx = (i + 1) * 2;
    cache[idx] = totalKm;
    cache[idx + 1] = totalHours;
  }

  return cache;
}
