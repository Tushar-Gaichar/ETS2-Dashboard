import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  IconPower,
  IconBulb,
  IconVolume2,
  IconSettings,
  IconTruck,
  IconBolt,
  IconSun,
  IconAlertTriangle,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconLock,
  IconMaximize,
  IconActivity,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRight,
  IconArrowsVertical,
  IconParkingCircle,
  IconWiper,
  IconLink,
  IconEngine,
} from "@tabler/icons-react";
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
          </div>
        </div>

        <Tabs defaultValue="engine" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="engine">Engine</TabsTrigger>
            <TabsTrigger value="lights">Lights</TabsTrigger>
            <TabsTrigger value="transmission">Gear</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Engine & Power Controls */}
          <TabsContent value="engine" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <IconPower className="mr-2 h-5 w-5" />
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
                    <IconSettings className="mr-2 h-4 w-4" />
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
                    <IconBolt className="mr-2 h-4 w-4" />
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
                    <IconActivity className="mr-2 h-4 w-4" />
                    Cruise Control
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_engine_brake')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <IconEngine className="mr-2 h-4 w-4" />
                    Engine Brake
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
                  <IconBulb className="mr-2 h-5 w-5" />
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
                    <IconSun className="mr-2 h-4 w-4" />
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
                    <IconSun className="mr-2 h-4 w-4" />
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
                    <IconAlertTriangle className="mr-2 h-4 w-4" />
                    Beacon Lights
                  </div>
                  {getStatusBadge(telemetryData?.truck.lightsBeacon || false)}
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('toggle_indicator_left')}
                    disabled={!isConnected}
                  >
                    <IconArrowLeft className="mr-2 h-4 w-4" />
                    Left Signal
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('toggle_indicator_right')}
                    disabled={!isConnected}
                  >
                    <IconArrowRight className="mr-2 h-4 w-4" />
                    Right Signal
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_hazard_lights')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <IconAlertTriangle className="mr-2 h-4 w-4" />
                    Hazard Lights
                  </div>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transmission Controls */}
          <TabsContent value="transmission" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <IconSettings className="mr-2 h-5 w-5" />
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
                    <IconArrowUp className="mr-2 h-4 w-4" />
                    Shift Up
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('shift_down')}
                    disabled={!isConnected}
                  >
                    <IconArrowDown className="mr-2 h-4 w-4" />
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
                    <IconArrowUp className="mr-2 h-4 w-4" />
                    Retarder +
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('retarder_decrease')}
                    disabled={!isConnected}
                  >
                    <IconArrowDown className="mr-2 h-4 w-4" />
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
                  <IconTruck className="mr-2 h-5 w-5" />
                  Other Controls
                </CardTitle>
                <CardDescription>
                  Horn, brakes, wipers, axles, and trailer coupling
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
                    <IconVolume2 className="mr-2 h-4 w-4" />
                    Horn
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleCommand('horn_long')}
                    disabled={!isConnected}
                  >
                    <IconVolume2 className="mr-2 h-4 w-4" />
                    Long Horn
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_parking_brake')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <IconParkingCircle className="mr-2 h-4 w-4" />
                    Parking Brake
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('cycle_wipers')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <IconWiper className="mr-2 h-4 w-4" />
                    Wipers
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_differential_lock')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <IconLock className="mr-2 h-4 w-4" />
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
                    <IconMaximize className="mr-2 h-4 w-4" />
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
                    <IconMaximize className="mr-2 h-4 w-4" />
                    Trailer Lift Axle
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('toggle_trailer_attach')}
                  disabled={!isConnected}
                >
                  <div className="flex items-center">
                    <IconLink className="mr-2 h-4 w-4" />
                    Trailer Attach / Detach
                  </div>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Controls — for setups (e.g. Moza wheels) that already
              cover the basics via their own device and just need the extras
              not everyone needs. */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <IconLayoutSidebarLeftExpand className="mr-2 h-5 w-5" />
                  Windows
                </CardTitle>
                <CardDescription>
                  Roll each window up or down individually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center">
                    <IconLayoutSidebarLeftExpand className="mr-1 h-3 w-3" />
                    Left Window
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('window_left_up')}
                      disabled={!isConnected}
                    >
                      <IconArrowUp className="mr-2 h-4 w-4" />
                      Up
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('window_left_down')}
                      disabled={!isConnected}
                    >
                      <IconArrowDown className="mr-2 h-4 w-4" />
                      Down
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center">
                    <IconLayoutSidebarRight className="mr-1 h-3 w-3" />
                    Right Window
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('window_right_up')}
                      disabled={!isConnected}
                    >
                      <IconArrowUp className="mr-2 h-4 w-4" />
                      Up
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('window_right_down')}
                      disabled={!isConnected}
                    >
                      <IconArrowDown className="mr-2 h-4 w-4" />
                      Down
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <IconArrowsVertical className="mr-2 h-5 w-5" />
                  Suspension
                </CardTitle>
                <CardDescription>
                  Trucks with adjustable air suspension only — truck front/rear
                  and trailer adjust independently. Reset always resets both
                  truck ends together.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Front</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('suspension_front_up')}
                      disabled={!isConnected}
                    >
                      <IconArrowUp className="mr-2 h-4 w-4" />
                      Raise
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('suspension_front_down')}
                      disabled={!isConnected}
                    >
                      <IconArrowDown className="mr-2 h-4 w-4" />
                      Lower
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Rear</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('suspension_rear_up')}
                      disabled={!isConnected}
                    >
                      <IconArrowUp className="mr-2 h-4 w-4" />
                      Raise
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('suspension_rear_down')}
                      disabled={!isConnected}
                    >
                      <IconArrowDown className="mr-2 h-4 w-4" />
                      Lower
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center">
                    <IconTruck className="mr-1 h-3 w-3" />
                    Trailer
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('trailer_suspension_up')}
                      disabled={!isConnected}
                    >
                      <IconArrowUp className="mr-2 h-4 w-4" />
                      Raise
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCommand('trailer_suspension_down')}
                      disabled={!isConnected}
                    >
                      <IconArrowDown className="mr-2 h-4 w-4" />
                      Lower
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleCommand('suspension_reset')}
                  disabled={!isConnected}
                >
                  Reset Suspension (Front + Rear)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}