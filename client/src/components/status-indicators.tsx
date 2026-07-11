import { Settings, Lightbulb } from "lucide-react";
import { TelemetryData } from "@shared/schema";

interface StatusIndicatorsProps {
  telemetryData: TelemetryData | null;
}

export default function StatusIndicators({ telemetryData }: StatusIndicatorsProps) {
  if (!telemetryData) {
    return (
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface rounded-lg p-4">
          <h4 className="font-semibold mb-2 flex items-center">
            <Settings className="text-primary mr-2 h-4 w-4" />
            Engine
          </h4>
          <div className="text-center text-muted-foreground py-2">
            No data
          </div>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <h4 className="font-semibold mb-2 flex items-center">
            <Lightbulb className="text-warning mr-2 h-4 w-4" />
            Lights
          </h4>
          <div className="text-center text-muted-foreground py-2">
            No data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Engine Status */}
      <div className="bg-surface rounded-lg p-4">
        <h4 className="font-semibold mb-2 flex items-center">
          <Settings className="text-primary mr-2 h-4 w-4" />
          Engine
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Temperature:</span>
            <span>{Math.round(telemetryData.truck.engineTemperature)}°C</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Oil Pressure:</span>
            <span>{telemetryData.truck.oilPressure.toFixed(1)} bar</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Enabled:</span>
            <span className={telemetryData.truck.engineEnabled ? "text-success" : "text-muted-foreground"}>
              {telemetryData.truck.engineEnabled ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </div>

      {/* Lights Status */}
      <div className="bg-surface rounded-lg p-4">
        <h4 className="font-semibold mb-2 flex items-center">
          <Lightbulb className="text-warning mr-2 h-4 w-4" />
          Lights
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Low Beam:</span>
            <span className={telemetryData.truck.lightsBeamLow ? "text-success" : "text-muted-foreground"}>
              {telemetryData.truck.lightsBeamLow ? "ON" : "OFF"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">High Beam:</span>
            <span className={telemetryData.truck.lightsBeamHigh ? "text-success" : "text-muted-foreground"}>
              {telemetryData.truck.lightsBeamHigh ? "ON" : "OFF"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Beacons:</span>
            <span className={telemetryData.truck.lightsBeacon ? "text-success" : "text-muted-foreground"}>
              {telemetryData.truck.lightsBeacon ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
