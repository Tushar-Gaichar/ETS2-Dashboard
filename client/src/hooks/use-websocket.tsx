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

const IS_STANDALONE = import.meta.env.VITE_STANDALONE === "true";

// Default telemetry state for standalone mode
const defaultTelemetryData: TelemetryData = {
  game: {
    connected: false,
    gameName: null,
    paused: false,
    time: new Date().toISOString(),
    timeScale: 1,
    nextRestStopTime: null,
    version: "1.0.0",
    telemetryPluginVersion: "1.0.0",
  },
  truck: {
    id: "default",
    make: "Default",
    model: "Truck",
    speed: 0,
    cruiseControlSpeed: 0,
    cruiseControlOn: false,
    odometer: 0,
    gear: 0,
    displayedGear: 0,
    forwardGears: 12,
    reverseGears: 4,
    shifterType: "automatic",
    engineRpm: 800,
    engineRpmMax: 2200,
    fuel: 350,
    fuelCapacity: 700,
    fuelAverageConsumption: 0,
    fuelWarningFactor: 0.15,
    fuelWarningOn: false,
    engineEnabled: false,
    electricEnabled: false,
    engineTemperature: 80,
    oilPressure: 4,
    oilTemperature: 80,
    waterTemperature: 80,
    batteryVoltage: 12.6,
    batteryVoltageWarning: false,
    lightsParking: false,
    lightsBeamLow: false,
    lightsBeamHigh: false,
    lightsAuxFront: false,
    lightsAuxRoof: false,
    lightsBeacon: false,
    lightsBrake: false,
    lightsReverse: false,
    lightsHazard: false,
    lightsIndicatorLeft: false,
    lightsIndicatorRight: false,
    placement: { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    cabin: { x: 0, y: 0, z: 0 },
    hook: { x: 0, y: 0, z: 0 },
    wearEngine: 0,
    wearTransmission: 0,
    wearCabin: 0,
    wearChassis: 0,
    wearWheels: 0,
    retarderLevel: 0,
    airPressure: 8,
    airPressureWarning: false,
    airPressureEmergency: false,
    adblue: 50,
    adblueCapacity: 100,
    adblueAverageConsumption: 0,
    adblueWarningOn: false,
    wipers: false,
    dashboardBacklight: 1,
    blinkerLeftActive: false,
    blinkerRightActive: false,
    blinkerLeftOn: false,
    blinkerRightOn: false,
  },
  trailer: {
    attached: false,
    id: "",
    name: "",
    mass: 0,
    wear: 0,
    placement: { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0 },
  },
  job: {
    income: 0,
    deadlineTime: null,
    remainingTime: null,
    sourceCity: "",
    sourceCityId: "",
    sourceCompany: "",
    sourceCompanyId: "",
    destinationCity: "",
    destinationCityId: "",
    destinationCompany: "",
    destinationCompanyId: "",
    market: "freight_market",
  },
  navigation: {
    estimatedTime: null,
    estimatedDistance: 0,
    speedLimit: 0,
    speedLimitWarning: false,
  },
};

const defaultConnectionStatus: ConnectionStatus = {
  connected: false,
  lastUpdate: Date.now(),
};

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(IS_STANDALONE ? false : false);
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(IS_STANDALONE ? defaultTelemetryData : null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(IS_STANDALONE ? defaultConnectionStatus : {
    connected: false,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback((serverAddress?: string) => {
    if (IS_STANDALONE) {
      console.log("Standalone mode: skipping WebSocket connection");
      return;
    }
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
    if (IS_STANDALONE) {
      console.log("Standalone mode: skipping WebSocket disconnect");
      return;
    }
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
    if (IS_STANDALONE) {
      console.log("Standalone mode: skipping WebSocket send", message);
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (IS_STANDALONE) {
      console.log("Standalone mode: skipping auto-connect");
      return;
    }
    // Auto-connect on mount
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Ping interval to keep connection alive
  useEffect(() => {
    if (IS_STANDALONE) {
      return;
    }
    if (isConnected) {
      const pingInterval = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, 30000); // Ping every 30 seconds
      
      return () => clearInterval(pingInterval);
    }
  }, [isConnected, sendMessage]);

  return {
    isConnected: IS_STANDALONE ? false : isConnected,
    telemetryData: IS_STANDALONE ? defaultTelemetryData : telemetryData,
    connectionStatus: IS_STANDALONE ? defaultConnectionStatus : connectionStatus,
    connect,
    disconnect,
    sendMessage,
  };
}
