import React from "react";
import { TelemetryData } from "@shared/schema";
import type { WidgetSettings } from "./index";

export default function FuelWidget({ telemetry, settings }: { telemetry: TelemetryData | null; settings?: WidgetSettings }) {
  const fuel = telemetry?.truck?.fuel ?? null;
  const capacity = telemetry?.truck?.fuelCapacity ?? null;

  const percent = fuel !== null && capacity ? Math.round((fuel / capacity) * 100) : null;

  return (
    <div>
      <div className="text-sm text-muted-foreground">Fuel</div>
      <div className="text-2xl font-bold">{fuel !== null ? `${Math.round(fuel)} L` : "—"}</div>
      {percent !== null ? <div className="text-xs text-muted-foreground">{percent}%</div> : null}
    </div>
  );
}
