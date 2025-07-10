import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { readTelemetryData, updateTelemetryServerUrl, getTelemetryServerConfig } from "./services/telemetry";
import { telemetryDataSchema, controlCommandSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // REST API endpoints
  app.get("/api/telemetry", async (req, res) => {
    try {
      const data = await storage.getLatestTelemetry();
      if (!data) {
        return res.status(404).json({ message: "No telemetry data available" });
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch telemetry data" });
    }
  });

  app.get("/api/status", async (req, res) => {
    try {
      const status = await storage.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connection status" });
    }
  });

  // Get telemetry server configuration
  app.get("/api/telemetry-config", (req, res) => {
    try {
      const config = getTelemetryServerConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to get telemetry configuration" });
    }
  });

  // Update telemetry server configuration
  app.post("/api/telemetry-config", (req, res) => {
    try {
      const { baseUrl } = req.body;
      
      if (!baseUrl || typeof baseUrl !== 'string') {
        return res.status(400).json({ message: "Base URL is required" });
      }

      // Validate URL format
      try {
        new URL(baseUrl);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      updateTelemetryServerUrl(baseUrl);
      
      const config = getTelemetryServerConfig();
      res.json({ message: "Telemetry server configuration updated", config });
    } catch (error) {
      res.status(500).json({ message: "Failed to update telemetry configuration" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time telemetry streaming
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedClients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    console.log('Client connected to telemetry WebSocket');
    connectedClients.add(ws);

    // Send initial connection status
    ws.send(JSON.stringify({
      type: 'connection_status',
      data: { connected: true, serverAddress: 'localhost' }
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          case 'request_telemetry':
            // Client requesting latest telemetry data
            sendLatestTelemetry(ws);
            break;
          case 'control_command':
            // Client sending control command
            handleControlCommand(data.data);
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from telemetry WebSocket');
      connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });

  // Function to send latest telemetry data to a specific client
  async function sendLatestTelemetry(ws: WebSocket) {
    try {
      const data = await storage.getLatestTelemetry();
      if (data && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'telemetry_data',
          data: data
        }));
      }
    } catch (error) {
      console.error('Error sending telemetry data:', error);
    }
  }

  // Function to broadcast telemetry data to all connected clients
  function broadcastTelemetryData(data: any) {
    const message = JSON.stringify({
      type: 'telemetry_data',
      data: data
    });

    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Function to handle control commands
  function handleControlCommand(commandData: any) {
    try {
      const command = controlCommandSchema.parse(commandData);
      console.log('Processing control command:', command);
      
      // In a real implementation, this would send the command to ETS2
      // For now, we'll just log the command and send a confirmation
      
      // Map of ETS2 key bindings (these would be actual keyboard inputs in production)
      const keyBindings: Record<string, string> = {
        'toggle_engine': 'E',
        'toggle_electric': 'Shift+E',
        'toggle_lights_parking': 'F2',
        'toggle_lights_beam_low': 'F3',
        'toggle_lights_beam_high': 'F4',
        'toggle_lights_beacon': 'F5',
        'toggle_lights_aux_front': 'F6',
        'toggle_lights_aux_roof': 'F7',
        'horn_short': 'H',
        'horn_long': 'Shift+H',
        'toggle_cruise_control': 'C',
        'toggle_retarder': 'R',
        'toggle_differential_lock': 'D',
        'toggle_lift_axle': 'L',
        'toggle_trailer_lift_axle': 'Shift+L',
        'shift_up': 'Up Arrow',
        'shift_down': 'Down Arrow',
        'toggle_range_splitter': 'S',
      };
      
      const keyBinding = keyBindings[command.command];
      if (keyBinding) {
        console.log(`Would send keyboard input: ${keyBinding} for command: ${command.command}`);
        
        // In production, this would use a Windows API to send keystrokes to ETS2
        // For development, we'll simulate the response
        
        // Broadcast command confirmation to all clients
        const confirmationMessage = JSON.stringify({
          type: 'command_confirmation',
          data: {
            command: command.command,
            success: true,
            message: `Command ${command.command} executed`
          }
        });
        
        connectedClients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(confirmationMessage);
          }
        });
      }
    } catch (error) {
      console.error('Error processing control command:', error);
      
      // Send error response to all clients
      const errorMessage = JSON.stringify({
        type: 'command_error',
        data: {
          error: 'Invalid command format',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(errorMessage);
        }
      });
    }
  }

  // Telemetry data polling and broadcasting
  let telemetryInterval: NodeJS.Timeout;
  
  const startTelemetryPolling = () => {
    telemetryInterval = setInterval(async () => {
      try {
        const telemetryData = await readTelemetryData();
        
        if (telemetryData) {
          // Validate data
          const validatedData = telemetryDataSchema.parse(telemetryData);
          
          // Store in memory
          await storage.storeTelemetryData(validatedData);
          
          // Update connection status
          await storage.updateConnectionStatus({
            connected: true,
            lastUpdate: Date.now()
          });
          
          // Broadcast to all connected clients
          broadcastTelemetryData(validatedData);
        } else {
          // No telemetry data available
          await storage.updateConnectionStatus({
            connected: false,
            lastUpdate: Date.now()
          });
        }
      } catch (error) {
        console.error('Error in telemetry polling:', error);
        
        // Update connection status to indicate error
        await storage.updateConnectionStatus({
          connected: false,
          lastUpdate: Date.now()
        });
      }
    }, 100); // Poll every 100ms for smooth real-time updates
  };

  // Start telemetry polling
  startTelemetryPolling();

  // Cleanup on server shutdown
  process.on('SIGINT', () => {
    if (telemetryInterval) {
      clearInterval(telemetryInterval);
    }
    
    // Close all WebSocket connections
    connectedClients.forEach((client) => {
      client.close();
    });
    
    console.log('Telemetry server shutting down...');
    process.exit(0);
  });

  return httpServer;
}
