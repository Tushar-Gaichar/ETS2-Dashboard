import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { readTelemetryData, updateTelemetryServerUrl, getTelemetryServerConfig } from "./services/telemetry";
import { telemetryDataSchema, controlCommandSchema } from "@shared/schema";
import { getSendKeysForCommand, sendKeysToEts2 } from "./services/controls";
import { loadControlsOverridesFromText } from "./services/controls";

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

  // Upload controls.sii text to set keybinding overrides
  app.post('/api/controls-overrides', (req, res) => {
    try {
      const { content } = req.body as { content?: string };
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: 'Missing controls.sii content' });
      }
      const count = loadControlsOverridesFromText(content);
      res.json({ message: 'Overrides loaded', mappings: count });
    } catch (error) {
      res.status(500).json({ message: 'Failed to load overrides' });
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

  // Simple user endpoint: return/create a default user via storage
  app.get("/api/user", async (req, res) => {
    try {
      const username = String(req.query.username ?? "default");

      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.createUser({ username });
      }

      res.json({ userId: user.id, username: user.username });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user info" });
    }
  });

  // List users
  app.get("/api/users", async (_req, res) => {
    try {
      const users = await storage.listUsers();
      // return minimal info
      const result = users.map((u: any) => ({ id: u.id, username: u.username }));
      res.json({ users: result });
    } catch (error) {
      res.status(500).json({ message: "Failed to list users" });
    }
  });

  app.delete("/api/users/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });

      await storage.deleteUser(userId);
      res.json({ message: "User deleted", userId });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Layout endpoints (save/load dashboard layout per user)
  app.get("/api/layouts/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });

      const layout = await storage.getUserLayout(userId);
      res.json({ userId, layout });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch layout" });
    }
  });

  app.delete("/api/layouts/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });

      await storage.deleteUserLayout(userId);
      res.json({ message: "Layout deleted", userId });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete layout" });
    }
  });

  app.post("/api/layouts/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });

      const { layout } = req.body;
      if (typeof layout === "undefined") {
        return res.status(400).json({ message: "Missing layout in request body" });
      }

      await storage.saveUserLayout(userId, layout);
      res.json({ message: "Layout saved", userId });
    } catch (error) {
      res.status(500).json({ message: "Failed to save layout" });
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
  async function handleControlCommand(commandData: any) {
    try {
      const command = controlCommandSchema.parse(commandData);
      console.log('Processing control command:', command);

      const keys = getSendKeysForCommand(command.command);
      if (!keys) {
        throw new Error(`No key mapping for command: ${command.command}`);
      }

      // Attempt to send keys to ETS2 (Windows only)
      await sendKeysToEts2(keys);

      // Broadcast command confirmation to all clients
      const confirmationMessage = JSON.stringify({
        type: 'command_confirmation',
        data: {
          command: command.command,
          success: true,
          message: `Command ${command.command} sent to ETS2`
        }
      });
      connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(confirmationMessage);
        }
      });
    } catch (error) {
      console.error('Error processing control command:', error);
      
      // Send error response to all clients
      const errorMessage = JSON.stringify({
        type: 'command_error',
        data: {
          error: 'Command execution failed',
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
