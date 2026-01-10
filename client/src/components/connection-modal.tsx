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
  const [serverAddress, setServerAddress] = useState("http://localhost:25555");
  const [error, setError] = useState("");

  const handleConnect = () => {
    if (!serverAddress.trim()) {
      setError("Please enter a server address");
      return;
    }

    // Validate URL format or add http:// if missing
    let url = serverAddress.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Check if it's an IP address and add default port
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::\d+)?$/;
      if (ipRegex.test(url)) {
        // Add port 25555 if not specified
        if (!url.includes(':')) {
          url = `http://${url}:25555`;
        } else {
          url = `http://${url}`;
        }
      } else {
        setError("Please enter a valid URL or IP address");
        return;
      }
    }

    // Validate final URL
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL or IP address");
      return;
    }

    setError("");
    onConnect(url);
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
            Enter the URL or IP address of your PC running the Funbit ETS2 telemetry server (default port: 25555)
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Network Note:</strong> If using a local IP (192.168.x.x), this only works when running the dashboard on the same network as your PC. For remote access, use your public IP with port forwarding.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="server-address">Server Address</Label>
            <Input
              id="server-address"
              type="text"
              placeholder="http://192.168.1.100:25555 or http://localhost:25555"
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
