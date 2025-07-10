import { TelemetryData } from "@shared/schema";

// Configuration for the Funbit ETS2 telemetry server
let ETS2_TELEMETRY_URL = 'http://localhost:25555/api/ets2/telemetry';
const TELEMETRY_TIMEOUT = 5000; // 5 seconds timeout

// Global state for telemetry connection
let isConnectedToETS2Server = false;
let lastTelemetryData: TelemetryData | null = null;
let connectionCheckInterval: NodeJS.Timeout | null = null;

// Function to update the telemetry server URL
export function updateTelemetryServerUrl(baseUrl: string): void {
  const cleanUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  ETS2_TELEMETRY_URL = `${cleanUrl}/api/ets2/telemetry`;
  
  console.log(`Updated ETS2 telemetry server URL to: ${ETS2_TELEMETRY_URL}`);
  
  // Reset connection state when URL changes
  isConnectedToETS2Server = false;
  
  // Check connection with new URL immediately
  checkETS2ServerConnection();
}

// Function to get current telemetry server configuration
export function getTelemetryServerConfig(): { baseUrl: string; connected: boolean } {
  const baseUrl = ETS2_TELEMETRY_URL.replace('/api/ets2/telemetry', '');
  return {
    baseUrl,
    connected: isConnectedToETS2Server
  };
}

// Initialize telemetry service
async function initializeTelemetryService() {
  console.log('Initializing ETS2 telemetry service...');
  
  // Start periodic connection checks
  connectionCheckInterval = setInterval(async () => {
    await checkETS2ServerConnection();
  }, 10000); // Check every 10 seconds
  
  // Initial connection check
  await checkETS2ServerConnection();
}

// Check if ETS2 telemetry server is available
async function checkETS2ServerConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT);
    
    const response = await fetch(ETS2_TELEMETRY_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      if (!isConnectedToETS2Server) {
        console.log('✅ Connected to ETS2 telemetry server at', ETS2_TELEMETRY_URL);
        isConnectedToETS2Server = true;
      }
      return true;
    } else {
      if (isConnectedToETS2Server) {
        console.log('❌ Lost connection to ETS2 telemetry server');
        isConnectedToETS2Server = false;
      }
      return false;
    }
  } catch (error) {
    if (isConnectedToETS2Server) {
      console.log('❌ ETS2 telemetry server not available - using demo data');
      isConnectedToETS2Server = false;
    }
    return false;
  }
}

// Read telemetry data from ETS2 server or return demo data
export async function readTelemetryData(): Promise<TelemetryData | null> {
  try {
    // Try to fetch from ETS2 telemetry server first
    if (await checkETS2ServerConnection()) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT);
      
      const response = await fetch(ETS2_TELEMETRY_URL, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const rawData = await response.json();
        const telemetryData = processTelemetryData(rawData);
        lastTelemetryData = telemetryData;
        return telemetryData;
      }
    }
    
    // Fallback to demo data if ETS2 server is not available
    return generateDemoTelemetryData();
    
  } catch (error) {
    console.error('Error reading telemetry data:', error);
    // Return demo data on error
    return generateDemoTelemetryData();
  }
}

// Process raw telemetry data from ETS2 server to match our schema
function processTelemetryData(rawData: any): TelemetryData {
  // The Funbit ETS2 telemetry server returns data in a slightly different format
  // We need to transform it to match our schema
  return {
    game: {
      connected: rawData.game?.connected ?? false,
      gameName: rawData.game?.gameName ?? null,
      paused: rawData.game?.paused ?? false,
      time: rawData.game?.time ?? new Date().toISOString(),
      timeScale: rawData.game?.timeScale ?? 1.0,
      nextRestStopTime: rawData.game?.nextRestStopTime ?? null,
      version: rawData.game?.version ?? "Unknown",
      telemetryPluginVersion: rawData.game?.telemetryPluginVersion ?? "Unknown",
    },
    truck: {
      id: rawData.truck?.id ?? "unknown",
      make: rawData.truck?.make ?? "Unknown",
      model: rawData.truck?.model ?? "Unknown",
      speed: rawData.truck?.speed ?? 0,
      cruiseControlSpeed: rawData.truck?.cruiseControlSpeed ?? 0,
      cruiseControlOn: rawData.truck?.cruiseControlOn ?? false,
      odometer: rawData.truck?.odometer ?? 0,
      gear: rawData.truck?.gear ?? 0,
      displayedGear: rawData.truck?.displayedGear ?? 0,
      forwardGears: rawData.truck?.forwardGears ?? 12,
      reverseGears: rawData.truck?.reverseGears ?? 1,
      shifterType: rawData.truck?.shifterType ?? "automatic",
      engineRpm: rawData.truck?.engineRpm ?? 0,
      engineRpmMax: rawData.truck?.engineRpmMax ?? 2500,
      fuel: rawData.truck?.fuel ?? 0,
      fuelCapacity: rawData.truck?.fuelCapacity ?? 700,
      fuelAverageConsumption: rawData.truck?.fuelAverageConsumption ?? 0,
      fuelWarningFactor: rawData.truck?.fuelWarningFactor ?? 0.15,
      fuelWarningOn: rawData.truck?.fuelWarningOn ?? false,
      
      // Engine and electrical
      engineEnabled: rawData.truck?.engineEnabled ?? false,
      electricEnabled: rawData.truck?.electricEnabled ?? false,
      engineTemperature: rawData.truck?.engineTemperature ?? 0,
      oilPressure: rawData.truck?.oilPressure ?? 0,
      oilTemperature: rawData.truck?.oilTemperature ?? 0,
      waterTemperature: rawData.truck?.waterTemperature ?? 0,
      batteryVoltage: rawData.truck?.batteryVoltage ?? 24,
      batteryVoltageWarning: rawData.truck?.batteryVoltageWarning ?? false,
      
      // Lights
      lightsParking: rawData.truck?.lightsParking ?? false,
      lightsBeamLow: rawData.truck?.lightsBeamLow ?? false,
      lightsBeamHigh: rawData.truck?.lightsBeamHigh ?? false,
      lightsAuxFront: rawData.truck?.lightsAuxFront ?? false,
      lightsAuxRoof: rawData.truck?.lightsAuxRoof ?? false,
      lightsBeacon: rawData.truck?.lightsBeacon ?? false,
      lightsBrake: rawData.truck?.lightsBrake ?? false,
      lightsReverse: rawData.truck?.lightsReverse ?? false,
      lightsHazard: rawData.truck?.lightsHazard ?? false,
      lightsIndicatorLeft: rawData.truck?.lightsIndicatorLeft ?? false,
      lightsIndicatorRight: rawData.truck?.lightsIndicatorRight ?? false,
      
      // Position and movement
      placement: rawData.truck?.placement ?? { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0 },
      acceleration: rawData.truck?.acceleration ?? { x: 0, y: 0, z: 0 },
      head: rawData.truck?.head ?? { x: 0, y: 0, z: 0 },
      cabin: rawData.truck?.cabin ?? { x: 0, y: 0, z: 0 },
      hook: rawData.truck?.hook ?? { x: 0, y: 0, z: 0 },
      
      // Damage/wear
      wearEngine: rawData.truck?.wearEngine ?? 0,
      wearTransmission: rawData.truck?.wearTransmission ?? 0,
      wearCabin: rawData.truck?.wearCabin ?? 0,
      wearChassis: rawData.truck?.wearChassis ?? 0,
      wearWheels: rawData.truck?.wearWheels ?? 0,
      
      // Additional properties
      retarderLevel: rawData.truck?.retarderLevel ?? 0,
      airPressure: rawData.truck?.airPressure ?? 0,
      airPressureWarning: rawData.truck?.airPressureWarning ?? false,
      airPressureEmergency: rawData.truck?.airPressureEmergency ?? false,
      adblue: rawData.truck?.adblue ?? 0,
      adblueCapacity: rawData.truck?.adblueCapacity ?? 0,
      adblueAverageConsumption: rawData.truck?.adblueAverageConsumption ?? 0,
      adblueWarningOn: rawData.truck?.adblueWarningOn ?? false,
      wipers: rawData.truck?.wipers ?? false,
      dashboardBacklight: rawData.truck?.dashboardBacklight ?? 1,
      blinkerLeftActive: rawData.truck?.blinkerLeftActive ?? false,
      blinkerRightActive: rawData.truck?.blinkerRightActive ?? false,
      blinkerLeftOn: rawData.truck?.blinkerLeftOn ?? false,
      blinkerRightOn: rawData.truck?.blinkerRightOn ?? false,
    },
    trailer: {
      attached: rawData.trailer?.attached ?? false,
      id: rawData.trailer?.id ?? "",
      name: rawData.trailer?.name ?? "",
      mass: rawData.trailer?.mass ?? 0,
      wear: rawData.trailer?.wear ?? 0,
      placement: rawData.trailer?.placement ?? { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0 },
    },
    job: {
      income: rawData.job?.income ?? 0,
      deadlineTime: rawData.job?.deadlineTime ?? null,
      remainingTime: rawData.job?.remainingTime ?? null,
      sourceCity: rawData.job?.sourceCity ?? "",
      sourceCityId: rawData.job?.sourceCityId ?? "",
      sourceCompany: rawData.job?.sourceCompany ?? "",
      sourceCompanyId: rawData.job?.sourceCompanyId ?? "",
      destinationCity: rawData.job?.destinationCity ?? "",
      destinationCityId: rawData.job?.destinationCityId ?? "",
      destinationCompany: rawData.job?.destinationCompany ?? "",
      destinationCompanyId: rawData.job?.destinationCompanyId ?? "",
      market: rawData.job?.market ?? "quick_job",
    },
    navigation: {
      estimatedTime: rawData.navigation?.estimatedTime ?? null,
      estimatedDistance: rawData.navigation?.estimatedDistance ?? 0,
      speedLimit: rawData.navigation?.speedLimit ?? 0,
      speedLimitWarning: rawData.navigation?.speedLimitWarning ?? false,
    },
  };
}

// Generate realistic demo telemetry data for development
function generateDemoTelemetryData(): TelemetryData {
  const now = new Date();
  const gameTime = new Date(2024, 0, 5, Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  const deadlineTime = new Date(now.getTime() + 3600000); // 1 hour from now
  const estimatedTime = new Date(now.getTime() + 1800000); // 30 minutes from now
  
  return {
    game: {
      connected: true,
      gameName: "ETS2",
      paused: false,
      time: gameTime.toISOString(),
      timeScale: 19.0,
      nextRestStopTime: new Date(now.getTime() + 2700000).toISOString(), // 45 minutes
      version: "1.50",
      telemetryPluginVersion: "11",
    },
    truck: {
      id: "scania",
      make: "Scania",
      model: "R 450",
      speed: Math.floor(Math.random() * 40) + 60, // 60-100 km/h
      cruiseControlSpeed: 80,
      cruiseControlOn: Math.random() > 0.5,
      odometer: Math.floor(Math.random() * 50000) + 100000, // 100k-150k km
      gear: Math.floor(Math.random() * 12) + 1,
      displayedGear: Math.floor(Math.random() * 12) + 1,
      forwardGears: 12,
      reverseGears: 1,
      shifterType: "manual",
      engineRpm: Math.floor(Math.random() * 800) + 1200, // 1200-2000 RPM
      engineRpmMax: 2200,
      fuel: Math.floor(Math.random() * 200) + 400, // 400-600 liters
      fuelCapacity: 700,
      fuelAverageConsumption: 0.285, // liters/km
      fuelWarningFactor: 0.15,
      fuelWarningOn: false,
      
      // Engine and electrical
      engineEnabled: true,
      electricEnabled: true,
      engineTemperature: Math.floor(Math.random() * 15) + 80, // 80-95°C
      oilPressure: Math.random() * 2 + 3.5, // 3.5-5.5 bar
      oilTemperature: Math.floor(Math.random() * 20) + 85, // 85-105°C
      waterTemperature: Math.floor(Math.random() * 15) + 80, // 80-95°C
      batteryVoltage: Math.random() * 2 + 23.5, // 23.5-25.5V
      batteryVoltageWarning: false,
      
      // Lights
      lightsParking: false,
      lightsBeamLow: true,
      lightsBeamHigh: false,
      lightsAuxFront: false,
      lightsAuxRoof: false,
      lightsBeacon: false,
      lightsBrake: false,
      lightsReverse: false,
      lightsHazard: false,
      lightsIndicatorLeft: Math.random() > 0.8,
      lightsIndicatorRight: Math.random() > 0.8,
      
      // Position and movement
      placement: {
        x: Math.random() * 10000 + 5000,
        y: Math.random() * 100 + 50,
        z: Math.random() * 10000 + 5000,
        heading: Math.random(), // 0-1 range
        pitch: (Math.random() - 0.5) * 0.1, // Small pitch variation
        roll: (Math.random() - 0.5) * 0.05, // Small roll variation
      },
      acceleration: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 2,
      },
      head: { x: 0, y: 0, z: 0 },
      cabin: { x: 0, y: 0, z: 0 },
      hook: { x: 0, y: 0, z: 0 },
      
      // Damage/wear (low values for demo)
      wearEngine: Math.random() * 0.1,
      wearTransmission: Math.random() * 0.1,
      wearCabin: Math.random() * 0.1,
      wearChassis: Math.random() * 0.1,
      wearWheels: Math.random() * 0.1,
      
      // Additional properties
      retarderLevel: Math.floor(Math.random() * 4),
      airPressure: Math.random() * 2 + 8, // 8-10 bar
      airPressureWarning: false,
      airPressureEmergency: false,
      adblue: Math.random() * 50 + 25, // 25-75 liters
      adblueCapacity: 75,
      adblueAverageConsumption: 0.02,
      adblueWarningOn: false,
      wipers: Math.random() > 0.7,
      dashboardBacklight: Math.random() * 0.5 + 0.5, // 0.5-1.0
      blinkerLeftActive: Math.random() > 0.8,
      blinkerRightActive: Math.random() > 0.8,
      blinkerLeftOn: Math.random() > 0.5,
      blinkerRightOn: Math.random() > 0.5,
    },
    trailer: {
      attached: true,
      id: "scs.box.chassis_4_2_d",
      name: "Standard Box Trailer",
      mass: Math.floor(Math.random() * 20000) + 5000, // 5-25 tons
      wear: Math.random() * 0.05, // Low wear for demo
      placement: {
        x: Math.random() * 10000 + 5000,
        y: Math.random() * 100 + 50,
        z: Math.random() * 10000 + 5000,
        heading: Math.random(),
        pitch: (Math.random() - 0.5) * 0.05,
        roll: (Math.random() - 0.5) * 0.02,
      },
    },
    job: {
      income: Math.floor(Math.random() * 3000) + 1500, // €1500-4500
      deadlineTime: deadlineTime.toISOString(),
      remainingTime: new Date(1800000).toISOString(), // 30 minutes remaining
      sourceCity: "Berlin",
      sourceCityId: "berlin",
      sourceCompany: "LKW Walter",
      sourceCompanyId: "lkw_walter",
      destinationCity: "Prague",
      destinationCityId: "prague",
      destinationCompany: "Konsalnet",
      destinationCompanyId: "konsalnet",
      market: "freight_market",
    },
    navigation: {
      estimatedTime: estimatedTime.toISOString(),
      estimatedDistance: Math.floor(Math.random() * 200000) + 50000, // 50-250km in meters
      speedLimit: 90,
      speedLimitWarning: false,
    },
  };
}

// Initialize telemetry service on module load
initializeTelemetryService();
