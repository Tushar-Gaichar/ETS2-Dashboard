import { useState, useEffect } from "react";
import { Truck, Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ConnectionModal from "@/components/connection-modal";
import TelemetryGauge from "@/components/telemetry-gauge";
import TruckInfo from "@/components/truck-info";
import JobInfo from "@/components/job-info";
import StatusIndicators from "@/components/status-indicators";
import NavigationInfo from "@/components/navigation-info";
import BottomNavigation from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import ResizablePanels from "@/components/resizable-panels";
import DashboardLayout from "@/components/dashboard-layout";
import UserProfile from "@/components/user-profile";

export default function Dashboard() {
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const { 
    isConnected, 
    telemetryData, 
    connectionStatus, 
    connect, 
    disconnect 
  } = useWebSocket();
  const [editMode, setEditMode] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  // resolve current user for persisting page-level settings
  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => { if (d?.userId) setUserId(d.userId); }).catch(() => {});
    const handler = (e: any) => { setUserId(e?.detail?.userId ?? null); };
    window.addEventListener('ets2:user-changed', handler as EventListener);
    return () => window.removeEventListener('ets2:user-changed', handler as EventListener);
  }, []);

  const handleConnect = async (serverAddress: string) => {
    setIsConnecting(true);
    try {
      // Configure the telemetry server on the backend
      await apiRequest('POST', '/api/telemetry-config', { baseUrl: serverAddress });

      toast({
        title: "Server Configured",
        description: `Connected to ETS2 telemetry server at ${serverAddress}`,
      });

      // Connect the WebSocket (this connects to our own WebSocket, not the ETS2 server)
      connect();
      
      setIsConnecting(false);
      setShowConnectionModal(false);
    } catch (error) {
      setIsConnecting(false);
      console.error('Connection failed:', error);
      toast({
        title: "Connection Failed",
        description: "Could not connect to the ETS2 telemetry server. Please check the address and try again.",
        variant: "destructive",
      });
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
          <div className="flex items-center space-x-4">
            <UserProfile />
            <div className="h-6 border-l border-surface-light" />
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
        <div className="mb-6">
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" variant={editMode ? 'secondary' : 'outline'} className="bg-[#2094f3ff] text-white hover:bg-[#1b82d8]" onClick={() => setEditMode(v => !v)}>
              {editMode ? 'Exit Edit' : 'Page Edit'}
            </Button>
          </div>
          <ResizablePanels editMode={editMode} userId={userId}>
            <TelemetryGauge
              value={telemetryData?.truck.speed || 0}
              maxValue={120}
              unit="km/h"
              label="Speed"
              color="hsl(207, 90%, 54%)"
            />
            <div>
              <TelemetryGauge
                value={telemetryData?.truck.engineRpm || 0}
                maxValue={telemetryData?.truck.engineRpmMax || 2200}
                unit="RPM"
                label="Engine"
                color="hsl(25, 95%, 53%)"
              />
              <div style={{ height: 16 }} />
              <TelemetryGauge
                value={telemetryData?.truck.fuel || 0}
                maxValue={telemetryData?.truck.fuelCapacity || 700}
                unit="L"
                label="Fuel"
                color="hsl(120, 61%, 50%)"
              />
            </div>
            <div className="bg-surface rounded-lg p-4 text-center">
              <div className="w-24 h-24 mx-auto mb-2 flex items-center justify-center">
                <div className="text-4xl font-bold text-primary">
                  {telemetryData?.truck.gear || 0}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Gear</div>
            </div>
          </ResizablePanels>
        </div>

        {/* Customizable Dashboard Layout */}
        <div className="mb-6">
          <DashboardLayout />
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
      <BottomNavigation />

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
