import { useWebSocket } from "@/hooks/use-websocket";
import ControlPanel from "@/components/control-panel";
import BottomNavigation from "@/components/bottom-navigation";
import { ControlCommand } from "@shared/schema";

export default function Controls() {
  const { isConnected, telemetryData, sendMessage } = useWebSocket();

  const handleSendCommand = (command: ControlCommand) => {
    sendMessage({
      type: 'control_command',
      data: command
    });
  };

  return (
    <>
      <ControlPanel 
        telemetryData={telemetryData}
        onSendCommand={handleSendCommand}
        isConnected={isConnected}
      />
      <BottomNavigation />
    </>
  );
}