import React from "react";
import { TelemetryData } from "@shared/schema";
import type { WidgetSettings } from "./index";

export default function SpeedWidget({ telemetry, settings }: { telemetry: TelemetryData | null; settings?: WidgetSettings }) {
  const raw = telemetry?.truck?.speed ?? null;
  const unit = settings?.unit ?? "kmh";

  const display = raw !== null
    ? unit === "mph"
      ? `${Math.round(raw * 0.621371)} mph`
      : `${Math.round(raw)} km/h`
    : "—";

  return (
    <div>
      <div className="text-sm text-muted-foreground">Speed</div>
      <div className="text-2xl font-bold">{display}</div>
    </div>
  );
}
