import { ClipboardList } from "lucide-react";
import { TelemetryData } from "@shared/schema";

interface JobInfoProps {
  telemetryData: TelemetryData | null;
}

export default function JobInfo({ telemetryData }: JobInfoProps) {
  if (!telemetryData) {
    return (
      <div className="bg-surface rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <ClipboardList className="text-secondary mr-2 h-5 w-5" />
          Current Job
        </h3>
        <div className="text-center text-muted-foreground py-4">
          No job data available
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-surface rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <ClipboardList className="text-secondary mr-2 h-5 w-5" />
        Current Job
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cargo:</span>
          <span className="font-semibold">{telemetryData.job.cargo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">From:</span>
          <span className="font-semibold">{telemetryData.job.sourceCity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">To:</span>
          <span className="font-semibold">{telemetryData.job.destinationCity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Distance:</span>
          <span className="font-semibold">{telemetryData.job.plannedDistanceKm} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cargo Mass:</span>
          <span className="font-semibold">{telemetryData.job.cargoMass / 1000}t</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Income:</span>
          <span className="font-semibold text-success">{formatCurrency(telemetryData.job.income)}</span>
        </div>
      </div>
    </div>
  );
}
