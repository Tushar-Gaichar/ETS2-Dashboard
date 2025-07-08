import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi, Loader2 } from "lucide-react";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (serverAddress: string) => void;
  isConnecting?: boolean;
}

export default function ConnectionModal({
  isOpen,
  onClose,
  onConnect,
  isConnecting = false,
}: ConnectionModalProps) {
  const [serverAddress, setServerAddress] = useState("192.168.1.100");
  const [error, setError] = useState("");

  const handleConnect = () => {
    if (!serverAddress.trim()) {
      setError("Please enter a server address");
      return;
    }

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(serverAddress.trim())) {
      setError("Please enter a valid IP address");
      return;
    }

    setError("");
    onConnect(serverAddress.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConnect();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Connect to PC Server
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your PC's IP address to connect to the ETS2 telemetry server
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="server-address">Server Address</Label>
            <Input
              id="server-address"
              type="text"
              placeholder="192.168.1.100"
              value={serverAddress}
              onChange={(e) => setServerAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isConnecting}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConnecting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
