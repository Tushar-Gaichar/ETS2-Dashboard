import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Power, 
  Lightbulb, 
  Volume2, 
  Settings, 
  Truck,
  Zap,
  Sun,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Lock,
  Maximize2,
  Activity
} from "lucide-react";
import { TelemetryData, ControlCommand } from "@shared/schema";

interface ControlPanelProps {
  telemetryData: TelemetryData | null;
  onSendCommand: (command: ControlCommand) => void;
  isConnected: boolean;
}

export default function ControlPanel({ 
  telemetryData, 
  onSendCommand, 
  isConnected 
}: ControlPanelProps) {
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadControls = async (file: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const text = await file.text();
      const res = await fetch('/api/controls-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(`Loaded keybinds (${data.mappings}) from controls.sii`);
      } else {
        setUploadMessage(data?.message || 'Failed to load controls.sii');
      }
    } catch {
      setUploadMessage('Failed to load controls.sii');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMessage(""), 2500);
    }
  };

  const handleCommand = (command: ControlCommand['command'], value?: boolean) => {
    if (!isConnected) return; // buttons are already disabled while disconnected, so this shouldn't be reachable
    onSendCommand({ command, value });
  };

  // Derives a human-readable light mode from telemetry instead of a plain
  // ON/OFF badge, since "Light Modes" cycles through actual distinct states
  // (not a simple toggle) — off / parking / low beam.
  const lightModeLabel = telemetryData?.truck.lightsBeamLow
    ? "Low Beam"
    : telemetryData?.truck.lightsParking
    ? "Parking"
    : "Off";

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"} className="ml-2">
      {isActive ? "ON" : "OFF"}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-dark text-white p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">ETS2 Controls</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            <input
              type="file"
              accept=".sii,.txt,text/plain"
              className="hidden"
              id="controls-sii-input"
              ref={fileInputRef}
              onChange={(e) => handleUploadControls(e.target.files?.[0] || null)}
            />
            <Button
              size="sm"
              variant="outline"
              className="bg-[#1b82d8] text-white hover:bg-[#166db8] border-transparent"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Loading…' : 'Load controls.sii'}
            </Button>
          </div>
        </div>

        {uploadMessage && (
          <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 mb-4 text-center">
            <span className="text-sm">{uploadMessage}</span>
          </div>
        )}

        <Tabs defaultValue="engine" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="engine">Engine</TabsTrigger>
            <TabsTrigger value="lights">Lights</TabsTrigger>
            <TabsTrigger value="transmission">Gear</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          {/* Engine & Power Controls */}
          <TabsContent value="engine" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Power className="mr-2 h-5 w-5" />
                  Engine Controls
                </CardTitle>
                <CardDescription>
                  Control engine and electrical systems
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-between"
                  onClick={() => handleCommand('toggle_engine')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Engine
                  </div>
                  {getStatusBadge(telemetryData?.truck.engineEnabled || false)}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-between"
                  onClick={() => handleCommand('toggle_electric')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Zap className="mr-2 h-4 w-4" />
                    Electrical
                  </div>
                  {getStatusBadge(telemetryData?.truck.electricEnabled || false)}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_cruise_control')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Activity className="mr-2 h-4 w-4" />
                    Cruise Control
                  </div>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lights Controls */}
          <TabsContent value="lights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="mr-2 h-5 w-5" />
                  Lighting Controls
                </CardTitle>
                <CardDescription>
                  Control all truck lighting systems
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-between"
                  onClick={() => handleCommand('toggle_lights_parking')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Sun className="mr-2 h-4 w-4" />
                    Light Modes
                  </div>
                  <Badge variant={lightModeLabel === "Off" ? "secondary" : "default"} className="ml-2">
                    {lightModeLabel}
                  </Badge>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-between"
                  onClick={() => handleCommand('toggle_lights_beam_high')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Sun className="mr-2 h-4 w-4" />
                    High Beam
                  </div>
                  {getStatusBadge(telemetryData?.truck.lightsBeamHigh || false)}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-between"
                  onClick={() => handleCommand('toggle_lights_beacon')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Beacon Lights
                  </div>
                  {getStatusBadge(telemetryData?.truck.lightsBeacon || false)}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transmission Controls */}
          <TabsContent value="transmission" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Transmission
                </CardTitle>
                <CardDescription>
                  Manual gear control and transmission settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {telemetryData?.truck.gear || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Gear</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('shift_up')}
                    disabled={!isConnected}
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Shift Up
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('shift_down')}
                    disabled={!isConnected}
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Shift Down
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('retarder_increase')}
                    disabled={!isConnected}
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Retarder +
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('retarder_decrease')}
                    disabled={!isConnected}
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Retarder -
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Controls */}
          <TabsContent value="other" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="mr-2 h-5 w-5" />
                  Other Controls
                </CardTitle>
                <CardDescription>
                  Horn, differential, and lift axle controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('horn_short')}
                    disabled={!isConnected}
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    Horn
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('horn_long')}
                    disabled={!isConnected}
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    Long Horn
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_differential_lock')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Lock className="mr-2 h-4 w-4" />
                    Differential Lock
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_lift_axle')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Lift Axle
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_trailer_lift_axle')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Trailer Lift Axle
                  </div>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}