import { useState, useEffect, useCallback, useRef } from "react";
import { TelemetryData, ConnectionStatus } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  data: any;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  telemetryData: TelemetryData | null;
  connectionStatus: ConnectionStatus;
  connect: (serverAddress?: string) => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback((serverAddress?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = serverAddress || window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setConnectionStatus({
          connected: true,
          serverAddress: host,
          lastUpdate: Date.now(),
        });
        reconnectAttempts.current = 0;
        
        // Request initial telemetry data
        ws.send(JSON.stringify({ type: 'request_telemetry' }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'telemetry_data':
              setTelemetryData(message.data);
              setConnectionStatus(prev => ({
                ...prev,
                lastUpdate: Date.now(),
              }));
              break;
              
            case 'connection_status':
              setConnectionStatus(message.data);
              break;
              
            case 'pong':
              // Handle ping/pong for connection keep-alive
              break;
              
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          lastUpdate: Date.now(),
        }));
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect(serverAddress);
          }, reconnectDelay);
        } else {
          console.log("Max reconnection attempts reached");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          lastUpdate: Date.now(),
        }));
      };

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setIsConnected(false);
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        lastUpdate: Date.now(),
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus(prev => ({
      ...prev,
      connected: false,
      lastUpdate: Date.now(),
    }));
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    // Auto-connect on mount
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Ping interval to keep connection alive
  useEffect(() => {
    if (isConnected) {
      const pingInterval = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, 30000); // Ping every 30 seconds
      
      return () => clearInterval(pingInterval);
    }
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    telemetryData,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
  };
}
