import { useState } from "react";
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
  Moon,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RotateCcw,
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
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  const handleCommand = (command: ControlCommand['command'], value?: boolean) => {
    if (!isConnected) {
      setFeedbackMessage("Not connected to server");
      setTimeout(() => setFeedbackMessage(""), 2000);
      return;
    }

    onSendCommand({ command, value });
    setFeedbackMessage(`Command sent: ${command.replace('_', ' ').toUpperCase()}`);
    setTimeout(() => setFeedbackMessage(""), 2000);
  };

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
          </div>
        </div>

        {feedbackMessage && (
          <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 mb-4 text-center">
            <span className="text-sm">{feedbackMessage}</span>
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
                    Parking Lights
                  </div>
                  {getStatusBadge(telemetryData?.truck.lightsParking || false)}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-between"
                  onClick={() => handleCommand('toggle_lights_beam_low')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Moon className="mr-2 h-4 w-4" />
                    Low Beam
                  </div>
                  {getStatusBadge(telemetryData?.truck.lightsBeamLow || false)}
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

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleCommand('toggle_lights_aux_front')}
                    disabled={!isConnected}
                  >
                    <div className="flex items-center">
                      <Lightbulb className="mr-1 h-3 w-3" />
                      Front Aux
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleCommand('toggle_lights_aux_roof')}
                    disabled={!isConnected}
                  >
                    <div className="flex items-center">
                      <Lightbulb className="mr-1 h-3 w-3" />
                      Roof Aux
                    </div>
                  </Button>
                </div>
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

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_range_splitter')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Range Splitter
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_retarder')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <Activity className="mr-2 h-4 w-4" />
                    Retarder
                  </div>
                </Button>
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