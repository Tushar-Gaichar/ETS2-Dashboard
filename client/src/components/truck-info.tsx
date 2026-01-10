import { Truck } from "lucide-react";
import { TelemetryData } from "@shared/schema";

interface TruckInfoProps {
  telemetryData: TelemetryData | null;
}

export default function TruckInfo({ telemetryData }: TruckInfoProps) {
  if (!telemetryData) {
    return (
      <div className="bg-surface rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Truck className="text-primary mr-2 h-5 w-5" />
          Truck Information
        </h3>
        <div className="text-center text-muted-foreground py-4">
          No truck data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <Truck className="text-primary mr-2 h-5 w-5" />
        Truck Information
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Make</div>
          <div className="font-semibold">{telemetryData.truck.make}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Model</div>
          <div className="font-semibold">{telemetryData.truck.model}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Engine RPM</div>
          <div className="font-semibold">{telemetryData.truck.engineRpm}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Max RPM</div>
          <div className="font-semibold">{telemetryData.truck.engineRpmMax}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Fuel Capacity</div>
          <div className="font-semibold">{telemetryData.truck.fuelCapacity}L</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Forward Gears</div>
          <div className="font-semibold">{telemetryData.truck.forwardGears}</div>
        </div>
      </div>
    </div>
  );
}
