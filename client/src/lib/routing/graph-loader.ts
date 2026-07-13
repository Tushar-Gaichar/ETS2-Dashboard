import RBush from "rbush";
import type { GraphEdge } from "./algorithm";

/**
 * Loads graph.bin + geometry.bin and builds the in-memory routing graph:
 * adjacency list, node coordinates, and an R-tree spatial index for
 * nearest-node lookups. Node coordinates aren't a separate file — each
 * edge's geometry start/end point in geometry.bin IS its two nodes'
 * coordinates, which is how TruckNav-Sim itself derives them (confirmed by
 * reading their GraphSystem.ts).
 *
 * Ported from TruckNav-Sim (github.com/Rares-Muntean/TruckNav-Sim) —
 * GPL-3.0.
 */

interface NodeIndexItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: number;
  coord: [number, number];
}

export interface RoutingGraph {
  adjacency: Map<number, GraphEdge[]>;
  nodeCoords: Map<number, [number, number]>;
  graphBuffer: ArrayBuffer;
  geometryBuffer: ArrayBuffer;
  geometryF32: Float32Array;
  /** Nearest node IDs to a given [lng, lat], closest first. */
  getClosestNodes: (target: [number, number], limit?: number, radiusDeg?: number) => number[];
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export async function loadRoutingGraph(baseUrl = "/routing-data/roadnetwork"): Promise<RoutingGraph> {
  const [graphRes, geometryRes] = await Promise.all([
    fetch(`${baseUrl}/graph.bin`),
    fetch(`${baseUrl}/geometry.bin`),
  ]);
  const graphBuffer = await graphRes.arrayBuffer();
  const geometryBuffer = await geometryRes.arrayBuffer();

  const graphF32 = new Float32Array(graphBuffer);
  const geometryF32 = new Float32Array(geometryBuffer);

  const adjacency = new Map<number, GraphEdge[]>();
  const uniqueNodes = new Map<number, { id: number; lng: number; lat: number }>();

  // 12 floats per directed edge: u, v, weight, hIn, hOut, isFerry,
  // requiredDlc, vPrefabId, startIndex, pointCount, maneuverType, exitNumber.
  for (let i = 0; i < graphF32.length; i += 12) {
    const u = graphF32[i]!;
    const v = graphF32[i + 1]!;
    const weight = graphF32[i + 2]!;
    const hIn = graphF32[i + 3]!;
    const hOut = graphF32[i + 4]!;
    const isFerry = graphF32[i + 5] === 1;
    const requiredDlc = graphF32[i + 6]!;
    const vPrefabId = graphF32[i + 7]!;
    const startIndex = graphF32[i + 8]!;
    const pointCount = graphF32[i + 9]!;
    const maneuverType = graphF32[i + 10]!;
    const exitNumber = graphF32[i + 11]!;

    if (!adjacency.has(u)) adjacency.set(u, []);
    adjacency.get(u)!.push({
      to: v,
      weight,
      hIn,
      hOut,
      isFerry,
      requiredDlc,
      vPrefabId,
      startIndex,
      pointCount,
      maneuverType,
      exitNumber,
    });

    if (!uniqueNodes.has(u)) {
      uniqueNodes.set(u, { id: u, lng: geometryF32[startIndex]!, lat: geometryF32[startIndex + 1]! });
    }
    if (!uniqueNodes.has(v)) {
      const lastIdx = startIndex + (pointCount - 1) * 2;
      uniqueNodes.set(v, { id: v, lng: geometryF32[lastIdx]!, lat: geometryF32[lastIdx + 1]! });
    }
  }

  const nodeCoords = new Map<number, [number, number]>();
  const items: NodeIndexItem[] = [];
  uniqueNodes.forEach((node) => {
    nodeCoords.set(node.id, [node.lng, node.lat]);
    items.push({
      minX: node.lng,
      minY: node.lat,
      maxX: node.lng,
      maxY: node.lat,
      id: node.id,
      coord: [node.lng, node.lat],
    });
  });

  const nodeTree = new RBush<NodeIndexItem>();
  nodeTree.load(items);

  function getClosestNodes(target: [number, number], limit = 5, radiusDeg = 0.02): number[] {
    const candidates = nodeTree.search({
      minX: target[0] - radiusDeg,
      minY: target[1] - radiusDeg,
      maxX: target[0] + radiusDeg,
      maxY: target[1] + radiusDeg,
    });
    if (candidates.length === 0) return [];
    return candidates
      .map((item) => ({ id: item.id, dist: haversineKm(target, item.coord) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit)
      .map((c) => c.id);
  }

  return { adjacency, nodeCoords, graphBuffer, geometryBuffer, geometryF32, getClosestNodes };
}
