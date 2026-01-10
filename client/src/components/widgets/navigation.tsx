import React from "react";
import { TelemetryData } from "@shared/schema";
import type { WidgetSettings } from "./index";

function formatDistance(meters?: number) {
  if (typeof meters !== 'number') return '—';
  if (meters >= 1000) return `${(meters/1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export default function NavigationWidget({ telemetry, settings }: { telemetry: TelemetryData | null; settings?: WidgetSettings }) {
  const eta = telemetry?.navigation?.estimatedTime ?? null;
  const distance = telemetry?.navigation?.estimatedDistance ?? null;
  const speedLimit = telemetry?.navigation?.speedLimit ?? null;

  return (
    <div>
      <div className="text-sm text-muted-foreground">Navigation</div>
      <div className="text-sm">ETA: {eta ?? '—'}</div>
      <div className="text-lg font-medium">Distance: {formatDistance(distance)}</div>
      {speedLimit ? <div className="text-xs text-muted-foreground">Limit {Math.round(speedLimit)} km/h</div> : null}
    </div>
  );
}
