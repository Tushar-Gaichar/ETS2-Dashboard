import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { readTelemetryData } from "./services/telemetry";
import { telemetryDataSchema } from "@shared/schema";

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
