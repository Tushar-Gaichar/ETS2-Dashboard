import { useState } from "react";
import { Truck, Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import ConnectionModal from "@/components/connection-modal";
import TelemetryGauge from "@/components/telemetry-gauge";
import TruckInfo from "@/components/truck-info";
import JobInfo from "@/components/job-info";
import StatusIndicators from "@/components/status-indicators";
import NavigationInfo from "@/components/navigation-info";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { 
    isConnected, 
    telemetryData, 
    connectionStatus, 
    connect, 
    disconnect 
  } = useWebSocket();

  const handleConnect = async (serverAddress: string) => {
    setIsConnecting(true);
    try {
      connect(serverAddress);
      // Give it a moment to establish connection
      setTimeout(() => {
        setIsConnecting(false);
        setShowConnectionModal(false);
      }, 2000);
    } catch (error) {
      setIsConnecting(false);
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Header */}
      <header className="bg-surface border-b border-surface-light p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Truck className="text-primary h-6 w-6" />
            <h1 className="text-lg font-semibold">ETS2 Dashboard</h1>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm text-success">Connected</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleDisconnect}
                >
                  <WifiOff className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                <span className="text-sm text-destructive">Disconnected</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowConnectionModal(true)}
                >
                  <Wifi className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 pb-20">
        {/* Connection prompt when disconnected */}
        {!isConnected && (
          <div className="bg-surface rounded-lg p-6 mb-6 text-center">
            <Wifi className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Connect to ETS2 Server</h2>
            <p className="text-muted-foreground mb-4">
              Connect to your PC running ETS2 to view telemetry data
            </p>
            <Button onClick={() => setShowConnectionModal(true)}>
              Connect Now
            </Button>
          </div>
        )}

        {/* Telemetry Gauges */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <TelemetryGauge
            value={telemetryData?.truck.speed || 0}
            maxValue={120}
            unit="km/h"
            label="Speed"
            color="hsl(207, 90%, 54%)"
          />
          <TelemetryGauge
            value={telemetryData?.truck.engineRpm || 0}
            maxValue={telemetryData?.truck.engineRpmMax || 2200}
            unit="RPM"
            label="Engine"
            color="hsl(25, 95%, 53%)"
          />
          <TelemetryGauge
            value={telemetryData?.truck.fuel || 0}
            maxValue={telemetryData?.truck.fuelCapacity || 700}
            unit="L"
            label="Fuel"
            color="hsl(120, 61%, 50%)"
          />
          <div className="bg-surface rounded-lg p-4 text-center">
            <div className="w-24 h-24 mx-auto mb-2 flex items-center justify-center">
              <div className="text-4xl font-bold text-primary">
                {telemetryData?.truck.gear || 0}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Gear</div>
          </div>
        </div>

        {/* Truck Information */}
        <TruckInfo telemetryData={telemetryData} />

        {/* Job Information */}
        <JobInfo telemetryData={telemetryData} />

        {/* Status Indicators */}
        <StatusIndicators telemetryData={telemetryData} />

        {/* Navigation Information */}
        <NavigationInfo telemetryData={telemetryData} />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-light">
        <div className="grid grid-cols-4 h-16">
          <button className="flex flex-col items-center justify-center space-y-1 text-primary">
            <div className="h-4 w-4 flex items-center justify-center">📊</div>
            <span className="text-xs">Dashboard</span>
          </button>
          <button className="flex flex-col items-center justify-center space-y-1 text-muted-foreground">
            <div className="h-4 w-4 flex items-center justify-center">🗺️</div>
            <span className="text-xs">Map</span>
          </button>
          <button className="flex flex-col items-center justify-center space-y-1 text-muted-foreground">
            <div className="h-4 w-4 flex items-center justify-center">🎮</div>
            <span className="text-xs">Controls</span>
          </button>
          <button className="flex flex-col items-center justify-center space-y-1 text-muted-foreground">
            <div className="h-4 w-4 flex items-center justify-center">⚙️</div>
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConnect}
        isConnecting={isConnecting}
      />
    </div>
  );
}
