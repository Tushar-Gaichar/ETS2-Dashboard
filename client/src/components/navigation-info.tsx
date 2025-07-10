import { MapPin } from "lucide-react";
import { TelemetryData } from "@shared/schema";

interface NavigationInfoProps {
  telemetryData: TelemetryData | null;
}

export default function NavigationInfo({ telemetryData }: NavigationInfoProps) {
  if (!telemetryData) {
    return (
      <div className="bg-surface rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <MapPin className="text-success mr-2 h-5 w-5" />
          Navigation
        </h3>
        <div className="text-center text-muted-foreground py-4">
          No navigation data available
        </div>
      </div>
    );
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  return (
    <div className="bg-surface rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <MapPin className="text-success mr-2 h-5 w-5" />
        Navigation
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">ETA:</span>
          <span className="font-semibold">{formatTime(telemetryData.navigation.estimatedTime)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Distance:</span>
          <span className="font-semibold">{formatDistance(telemetryData.navigation.estimatedDistance)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Speed Limit:</span>
          <span className="font-semibold">{telemetryData.navigation.speedLimit} km/h</span>
        </div>
      </div>
    </div>
  );
}
