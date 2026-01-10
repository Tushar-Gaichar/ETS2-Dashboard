import { z } from "zod";

// Placement object for 3D coordinates
export const placementSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  heading: z.number(), // 0-1 range where 0=north, 0.25=west, 0.5=south, 0.75=east
  pitch: z.number(),   // -0.25 to 0.25 range (-90 to 90 degrees)
  roll: z.number(),    // -0.5 to 0.5 range (-180 to 180 degrees)
});

// Vector object for simple 3D coordinates
export const vectorSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const telemetryDataSchema = z.object({
  // Game state
  game: z.object({
    connected: z.boolean(),
    gameName: z.string().nullable(), // "ETS2" or "ATS"
    paused: z.boolean(),
    time: z.string(), // ISO 8601 date string
    timeScale: z.number(),
    nextRestStopTime: z.string().nullable(), // ISO 8601 date string
    version: z.string(),
    telemetryPluginVersion: z.string(),
  }),
  
  // Truck data
  truck: z.object({
    id: z.string(), // Brand ID: "daf", "iveco", "man", "mercedes", "renault", "scania", "volvo"
    make: z.string(), // Localized brand name
    model: z.string(), // Truck model name
    speed: z.number(), // km/h (negative if reversing)
    cruiseControlSpeed: z.number(),
    cruiseControlOn: z.boolean(),
    odometer: z.number(), // km
    gear: z.number(), // Current physical gear (positive=forward, negative=reverse)
    displayedGear: z.number(), // Gear shown on dashboard
    forwardGears: z.number(),
    reverseGears: z.number(),
    shifterType: z.string(), // "arcade", "automatic", "manual", "hshifter"
    engineRpm: z.number(),
    engineRpmMax: z.number(),
    fuel: z.number(), // liters
    fuelCapacity: z.number(),
    fuelAverageConsumption: z.number(), // liters/km
    fuelWarningFactor: z.number(),
    fuelWarningOn: z.boolean(),
    
    // Engine and electrical
    engineEnabled: z.boolean(),
    electricEnabled: z.boolean(),
    engineTemperature: z.number(),
    oilPressure: z.number(),
    oilTemperature: z.number(),
    waterTemperature: z.number(),
    batteryVoltage: z.number(),
    batteryVoltageWarning: z.boolean(),
    
    // Lights
    lightsParking: z.boolean(),
    lightsBeamLow: z.boolean(),
    lightsBeamHigh: z.boolean(),
    lightsAuxFront: z.boolean(),
    lightsAuxRoof: z.boolean(),
    lightsBeacon: z.boolean(),
    lightsBrake: z.boolean(),
    lightsReverse: z.boolean(),
    lightsHazard: z.boolean(),
    lightsIndicatorLeft: z.boolean(),
    lightsIndicatorRight: z.boolean(),
    
    // Position and movement
    placement: placementSchema,
    acceleration: vectorSchema,
    head: vectorSchema,
    cabin: vectorSchema,
    hook: vectorSchema,
    
    // Damage/wear (0-1 range)
    wearEngine: z.number(),
    wearTransmission: z.number(),
    wearCabin: z.number(),
    wearChassis: z.number(),
    wearWheels: z.number(),
    
    // Additional truck properties
    retarderLevel: z.number(),
    airPressure: z.number(),
    airPressureWarning: z.boolean(),
    airPressureEmergency: z.boolean(),
    adblue: z.number(),
    adblueCapacity: z.number(),
    adblueAverageConsumption: z.number(),
    adblueWarningOn: z.boolean(),
    wipers: z.boolean(),
    dashboardBacklight: z.number(),
    blinkerLeftActive: z.boolean(),
    blinkerRightActive: z.boolean(),
    blinkerLeftOn: z.boolean(),
    blinkerRightOn: z.boolean(),
  }),
  
  // Trailer data
  trailer: z.object({
    attached: z.boolean(),
    id: z.string(),
    name: z.string(),
    mass: z.number(),
    wear: z.number(),
    placement: placementSchema,
  }),
  
  // Job data
  job: z.object({
    income: z.number(),
    deadlineTime: z.string().nullable(), // ISO 8601 date string
    remainingTime: z.string().nullable(), // ISO 8601 date string
    sourceCity: z.string(),
    sourceCityId: z.string(),
    sourceCompany: z.string(),
    sourceCompanyId: z.string(),
    destinationCity: z.string(),
    destinationCityId: z.string(),
    destinationCompany: z.string(),
    destinationCompanyId: z.string(),
    market: z.string(), // "external_contracts", "freight_market", "quick_job"
  }),
  
  // Navigation data
  navigation: z.object({
    estimatedTime: z.string().nullable(), // ISO 8601 date string (ETA)
    estimatedDistance: z.number(), // meters
    speedLimit: z.number(), // km/h
    speedLimitWarning: z.boolean(),
  }),
});

export type TelemetryData = z.infer<typeof telemetryDataSchema>;

export const connectionStatusSchema = z.object({
  connected: z.boolean(),
  serverAddress: z.string().optional(),
  lastUpdate: z.number().optional(),
});

export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;

// Control commands schema for sending commands to the game
export const controlCommandSchema = z.object({
  command: z.enum([
    'toggle_engine',
    'toggle_electric',
    'toggle_lights_parking',
    'toggle_lights_beam_low',
    'toggle_lights_beam_high',
    'toggle_lights_beacon',
    'toggle_lights_aux_front',
    'toggle_lights_aux_roof',
    'horn_short',
    'horn_long',
    'toggle_cruise_control',
    'toggle_retarder',
    'toggle_differential_lock',
    'toggle_lift_axle',
    'toggle_trailer_lift_axle',
    'shift_up',
    'shift_down',
    'toggle_range_splitter',
  ]),
  value: z.boolean().optional(),
});

export type ControlCommand = z.infer<typeof controlCommandSchema>;
