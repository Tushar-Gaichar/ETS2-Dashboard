export interface RouteResult {
  path: [number, number][];
  distanceKm: number;
  etaHours: number;
}

type PendingResolve = { resolve: (r: RouteResult | null) => void; reject: (err: Error) => void };

/**
 * Main-thread handle to the routing worker. Create once (e.g. on map
 * mount), await `ready`, then call `findRoute()` as many times as needed —
 * each call is a fresh request correlated by id, so overlapping requests
 * (e.g. a fast second map click before the first route finishes) resolve
 * to their own caller instead of getting mixed up.
 */
export function createRoutingClient() {
  const worker = new Worker(new URL("./route-worker.ts", import.meta.url), { type: "module" });

  let nextRequestId = 0;
  const pending = new Map<number, PendingResolve>();

  const ready = new Promise<void>((resolve, reject) => {
    worker.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === "READY") {
        resolve();
        // Switch to the steady-state handler now that init is done.
        worker.onmessage = (evt) => {
          const m = evt.data;
          if (m.type === "ROUTE_RESULT") {
            const p = pending.get(m.requestId);
            if (!p) return;
            pending.delete(m.requestId);
            if (m.error && !m.result) p.reject(new Error(m.error));
            else p.resolve(m.result);
          }
        };
        return;
      }

      if (msg.type === "ERROR") {
        reject(new Error(msg.error));
      }
    };

    worker.postMessage({ type: "INIT" });
  });

  function findRoute(
    startPoint: [number, number],
    startHeadingDeg: number | null,
    endPoint: [number, number],
    avgSpeedKmh = 70,
  ): Promise<RouteResult | null> {
    const requestId = nextRequestId++;
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      worker.postMessage({ type: "FIND_ROUTE", requestId, startPoint, startHeadingDeg, endPoint, avgSpeedKmh });
    });
  }

  function destroy() {
    worker.terminate();
    pending.clear();
  }

  return { ready, findRoute, destroy };
}
