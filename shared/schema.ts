import { z } from "zod";

export const telemetryDataSchema = z.object({
  // Game state
  game: z.object({
    connected: z.boolean(),
    paused: z.boolean(),
    time: z.number(),
    timeScale: z.number(),
  }),
  
  // Truck data
  truck: z.object({
    make: z.string(),
    model: z.string(),
    speed: z.number(), // km/h
    engineRpm: z.number(),
    engineRpmMax: z.number(),
    fuel: z.number(), // liters
    fuelCapacity: z.number(),
    fuelAverageConsumption: z.number(),
    gear: z.number(),
    gearRange: z.number(),
    engineTemperature: z.number(),
    oilPressure: z.number(),
    engineEnabled: z.boolean(),
    electricEnabled: z.boolean(),
    
    // Lights
    lightsParking: z.boolean(),
    lightsBeamLow: z.boolean(),
    lightsBeamHigh: z.boolean(),
    lightsAuxFront: z.boolean(),
    lightsAuxRoof: z.boolean(),
    lightsBeacon: z.boolean(),
    lightsBrake: z.boolean(),
    lightsReverse: z.boolean(),
    
    // Position
    coordinateX: z.number(),
    coordinateY: z.number(),
    coordinateZ: z.number(),
    rotationX: z.number(),
    rotationY: z.number(),
    rotationZ: z.number(),
    
    // Damage
    wearEngine: z.number(),
    wearTransmission: z.number(),
    wearCabin: z.number(),
    wearChassis: z.number(),
    wearWheels: z.number(),
  }),
  
  // Job data
  job: z.object({
    income: z.number(),
    deadlineTime: z.number(),
    remainingTime: z.number(),
    sourceCity: z.string(),
    sourceCityId: z.string(),
    destinationCity: z.string(),
    destinationCityId: z.string(),
    sourceCompany: z.string(),
    destinationCompany: z.string(),
    cargo: z.string(),
    cargoMass: z.number(),
    plannedDistanceKm: z.number(),
  }),
  
  // Navigation
  navigation: z.object({
    estimatedTime: z.number(),
    estimatedDistance: z.number(),
    speedLimit: z.number(),
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
