import { useWebSocket } from "@/hooks/use-websocket";
import ControlPanel from "@/components/control-panel";
import BottomNavigation from "@/components/bottom-navigation";
import { ControlCommand } from "@shared/schema";

export default function Controls() {
  const IS_STANDALONE = import.meta.env.VITE_STANDALONE === "true";
  const { isConnected, telemetryData, sendMessage } = useWebSocket();

  const handleSendCommand = (command: ControlCommand) => {
    if (IS_STANDALONE) {
      console.log("Standalone mode: skipping control command", command);
      return;
    }
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
        isStandalone={IS_STANDALONE}
      />
      <BottomNavigation />
    </>
  );
}