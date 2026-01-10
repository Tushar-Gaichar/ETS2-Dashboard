import React from "react";
import { TelemetryData } from "@shared/schema";
import type { WidgetSettings } from "./index";

export default function RpmWidget({ telemetry, settings }: { telemetry: TelemetryData | null; settings?: WidgetSettings }) {
  const rpm = telemetry?.truck?.engineRpm ?? null;
  const rpmMax = telemetry?.truck?.engineRpmMax ?? null;
  const warnAbove = settings?.warnAbove ?? null;

  const rpmDisplay = rpm !== null ? `${Math.round(rpm)} rpm` : "—";

  return (
    <div>
      <div className="text-sm text-muted-foreground">Engine RPM</div>
      <div className="text-2xl font-bold" style={{ color: warnAbove && rpm && rpm > warnAbove ? 'crimson' : undefined }}>{rpmDisplay}</div>
      {rpmMax ? <div className="text-xs text-muted-foreground">Max {Math.round(rpmMax)} rpm</div> : null}
      {warnAbove ? <div className="text-xs text-muted-foreground">Warn &gt; {warnAbove} rpm</div> : null}
    </div>
  );
}
