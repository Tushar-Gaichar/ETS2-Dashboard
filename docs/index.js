// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// server/storage.ts
import fs from "fs";
import path from "path";
var MemStorage = class {
  users;
  currentId;
  latestTelemetry = null;
  connectionStatus = {
    connected: false,
    lastUpdate: void 0
  };
  layouts = /* @__PURE__ */ new Map();
  dataDir;
  usersFile;
  usersCache = {};
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.currentId = 1;
    this.dataDir = path.resolve(process.cwd(), "server", "data");
    this.usersFile = path.join(this.dataDir, "users.json");
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    if (fs.existsSync(this.usersFile)) {
      try {
        this.usersCache = JSON.parse(fs.readFileSync(this.usersFile, "utf8") || "{}");
        Object.keys(this.usersCache).forEach((k) => {
          const id = Number(k);
          if (!Number.isNaN(id)) this.users.set(id, this.usersCache[k]);
        });
        const ids = Object.keys(this.usersCache).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
        if (ids.length) this.currentId = Math.max(...ids) + 1;
      } catch {
        this.usersCache = {};
      }
    } else {
      fs.writeFileSync(this.usersFile, JSON.stringify({}), "utf8");
    }
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }
  async createUser(insertUser) {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    this.usersCache[String(id)] = user;
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(this.usersCache, null, 2), "utf8");
    } catch {
    }
    return user;
  }
  async getLatestTelemetry() {
    return this.latestTelemetry;
  }
  async storeTelemetryData(data) {
    this.latestTelemetry = data;
  }
  async getConnectionStatus() {
    return this.connectionStatus;
  }
  async updateConnectionStatus(status) {
    this.connectionStatus = status;
  }
  async getUserLayout(userId) {
    return this.layouts.get(userId) ?? null;
  }
  async saveUserLayout(userId, layout) {
    this.layouts.set(userId, layout);
  }
  async listUsers() {
    return Array.from(this.users.values());
  }
  async deleteUser(userId) {
    this.users.delete(userId);
    delete this.usersCache[String(userId)];
    try {
      this.layouts.delete(userId);
    } catch {
    }
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(this.usersCache, null, 2), "utf8");
    } catch {
    }
  }
  async deleteUserLayout(userId) {
    this.layouts.delete(userId);
  }
};
var FileStorage = class {
  users = /* @__PURE__ */ new Map();
  currentId = 1;
  latestTelemetry = null;
  connectionStatus = {
    connected: false,
    lastUpdate: void 0
  };
  dataDir;
  layoutsFile;
  layoutsCache = {};
  usersFile;
  usersCache = {};
  constructor() {
    this.dataDir = path.resolve(process.cwd(), "server", "data");
    this.layoutsFile = path.join(this.dataDir, "layouts.json");
    this.usersFile = path.join(this.dataDir, "users.json");
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    if (fs.existsSync(this.layoutsFile)) {
      try {
        this.layoutsCache = JSON.parse(fs.readFileSync(this.layoutsFile, "utf8") || "{}");
      } catch {
        this.layoutsCache = {};
      }
    } else {
      fs.writeFileSync(this.layoutsFile, JSON.stringify({}), "utf8");
    }
    if (fs.existsSync(this.usersFile)) {
      try {
        this.usersCache = JSON.parse(fs.readFileSync(this.usersFile, "utf8") || "{}");
        Object.keys(this.usersCache).forEach((k) => {
          const u = this.usersCache[k];
          const id = Number(k);
          if (!Number.isNaN(id)) this.users.set(id, u);
        });
        const ids = Object.keys(this.usersCache).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
        if (ids.length) this.currentId = Math.max(...ids) + 1;
      } catch {
        this.usersCache = {};
      }
    } else {
      fs.writeFileSync(this.usersFile, JSON.stringify({}), "utf8");
    }
  }
  persistLayouts() {
    fs.writeFileSync(this.layoutsFile, JSON.stringify(this.layoutsCache, null, 2), "utf8");
  }
  persistUsers() {
    const out = {};
    this.users.forEach((v, k) => {
      out[String(k)] = v;
    });
    fs.writeFileSync(this.usersFile, JSON.stringify(out, null, 2), "utf8");
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }
  async createUser(insertUser) {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    this.usersCache[String(id)] = user;
    try {
      this.persistUsers();
    } catch {
    }
    return user;
  }
  async getLatestTelemetry() {
    return this.latestTelemetry;
  }
  async storeTelemetryData(data) {
    this.latestTelemetry = data;
  }
  async getConnectionStatus() {
    return this.connectionStatus;
  }
  async updateConnectionStatus(status) {
    this.connectionStatus = status;
  }
  async getUserLayout(userId) {
    return this.layoutsCache[String(userId)] ?? null;
  }
  async saveUserLayout(userId, layout) {
    this.layoutsCache[String(userId)] = layout;
    this.persistLayouts();
  }
  async listUsers() {
    return Array.from(this.users.values());
  }
  async deleteUser(userId) {
    this.users.delete(userId);
    delete this.usersCache[String(userId)];
    try {
      delete this.layoutsCache[String(userId)];
      this.persistLayouts();
    } catch {
    }
    try {
      this.persistUsers();
    } catch {
    }
  }
  async deleteUserLayout(userId) {
    delete this.layoutsCache[String(userId)];
    this.persistLayouts();
  }
};
var storage = process.env.PERSISTENT_STORAGE === "file" ? new FileStorage() : new MemStorage();

// server/services/telemetry.ts
var ETS2_TELEMETRY_URL = "http://localhost:25555/api/ets2/telemetry";
var TELEMETRY_TIMEOUT = 5e3;
var isConnectedToETS2Server = false;
var lastTelemetryData = null;
var connectionCheckInterval = null;
function updateTelemetryServerUrl(baseUrl) {
  const cleanUrl = baseUrl.replace(/\/$/, "");
  if (cleanUrl.includes("/api/ets2/telemetry")) {
    ETS2_TELEMETRY_URL = cleanUrl;
  } else {
    ETS2_TELEMETRY_URL = `${cleanUrl}/api/ets2/telemetry`;
  }
  console.log(`Updated ETS2 telemetry server URL to: ${ETS2_TELEMETRY_URL}`);
  isConnectedToETS2Server = false;
  checkETS2ServerConnection();
}
function getTelemetryServerConfig() {
  const baseUrl = ETS2_TELEMETRY_URL.replace("/api/ets2/telemetry", "");
  return {
    baseUrl,
    connected: isConnectedToETS2Server
  };
}
async function initializeTelemetryService() {
  console.log("Initializing ETS2 telemetry service...");
  connectionCheckInterval = setInterval(async () => {
    await checkETS2ServerConnection();
  }, 1e4);
  await checkETS2ServerConnection();
}
async function checkETS2ServerConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT);
    const response = await fetch(ETS2_TELEMETRY_URL, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json"
      }
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      if (!isConnectedToETS2Server) {
        console.log("\u2705 Connected to ETS2 telemetry server at", ETS2_TELEMETRY_URL);
        isConnectedToETS2Server = true;
      }
      return true;
    } else {
      if (isConnectedToETS2Server) {
        console.log("\u274C Lost connection to ETS2 telemetry server");
        isConnectedToETS2Server = false;
      }
      return false;
    }
  } catch (error) {
    if (isConnectedToETS2Server) {
      console.log("\u274C ETS2 telemetry server not available:", error.message);
      isConnectedToETS2Server = false;
    }
    return false;
  }
}
async function readTelemetryData() {
  try {
    if (await checkETS2ServerConnection()) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT);
      const response = await fetch(ETS2_TELEMETRY_URL, {
        signal: controller.signal,
        headers: {
          "Accept": "application/json"
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
    return null;
  } catch (error) {
    console.error("Error reading telemetry data:", error.message || error);
    return null;
  }
}
function processTelemetryData(rawData) {
  return {
    game: {
      connected: rawData.game?.connected ?? false,
      gameName: rawData.game?.gameName ?? null,
      paused: rawData.game?.paused ?? false,
      time: rawData.game?.time ?? (/* @__PURE__ */ new Date()).toISOString(),
      timeScale: rawData.game?.timeScale ?? 1,
      nextRestStopTime: rawData.game?.nextRestStopTime ?? null,
      version: rawData.game?.version ?? "Unknown",
      telemetryPluginVersion: rawData.game?.telemetryPluginVersion ?? "Unknown"
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
      blinkerRightOn: rawData.truck?.blinkerRightOn ?? false
    },
    trailer: {
      attached: rawData.trailer?.attached ?? false,
      id: rawData.trailer?.id ?? "",
      name: rawData.trailer?.name ?? "",
      mass: rawData.trailer?.mass ?? 0,
      wear: rawData.trailer?.wear ?? 0,
      placement: rawData.trailer?.placement ?? { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0 }
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
      market: rawData.job?.market ?? "quick_job"
    },
    navigation: {
      estimatedTime: rawData.navigation?.estimatedTime ?? null,
      estimatedDistance: rawData.navigation?.estimatedDistance ?? 0,
      speedLimit: rawData.navigation?.speedLimit ?? 0,
      speedLimitWarning: rawData.navigation?.speedLimitWarning ?? false
    }
  };
}
initializeTelemetryService();

// shared/schema.ts
import { z } from "zod";
var placementSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  heading: z.number(),
  // 0-1 range where 0=north, 0.25=west, 0.5=south, 0.75=east
  pitch: z.number(),
  // -0.25 to 0.25 range (-90 to 90 degrees)
  roll: z.number()
  // -0.5 to 0.5 range (-180 to 180 degrees)
});
var vectorSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
});
var telemetryDataSchema = z.object({
  // Game state
  game: z.object({
    connected: z.boolean(),
    gameName: z.string().nullable(),
    // "ETS2" or "ATS"
    paused: z.boolean(),
    time: z.string(),
    // ISO 8601 date string
    timeScale: z.number(),
    nextRestStopTime: z.string().nullable(),
    // ISO 8601 date string
    version: z.string(),
    telemetryPluginVersion: z.string()
  }),
  // Truck data
  truck: z.object({
    id: z.string(),
    // Brand ID: "daf", "iveco", "man", "mercedes", "renault", "scania", "volvo"
    make: z.string(),
    // Localized brand name
    model: z.string(),
    // Truck model name
    speed: z.number(),
    // km/h (negative if reversing)
    cruiseControlSpeed: z.number(),
    cruiseControlOn: z.boolean(),
    odometer: z.number(),
    // km
    gear: z.number(),
    // Current physical gear (positive=forward, negative=reverse)
    displayedGear: z.number(),
    // Gear shown on dashboard
    forwardGears: z.number(),
    reverseGears: z.number(),
    shifterType: z.string(),
    // "arcade", "automatic", "manual", "hshifter"
    engineRpm: z.number(),
    engineRpmMax: z.number(),
    fuel: z.number(),
    // liters
    fuelCapacity: z.number(),
    fuelAverageConsumption: z.number(),
    // liters/km
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
    blinkerRightOn: z.boolean()
  }),
  // Trailer data
  trailer: z.object({
    attached: z.boolean(),
    id: z.string(),
    name: z.string(),
    mass: z.number(),
    wear: z.number(),
    placement: placementSchema
  }),
  // Job data
  job: z.object({
    income: z.number(),
    deadlineTime: z.string().nullable(),
    // ISO 8601 date string
    remainingTime: z.string().nullable(),
    // ISO 8601 date string
    sourceCity: z.string(),
    sourceCityId: z.string(),
    sourceCompany: z.string(),
    sourceCompanyId: z.string(),
    destinationCity: z.string(),
    destinationCityId: z.string(),
    destinationCompany: z.string(),
    destinationCompanyId: z.string(),
    market: z.string()
    // "external_contracts", "freight_market", "quick_job"
  }),
  // Navigation data
  navigation: z.object({
    estimatedTime: z.string().nullable(),
    // ISO 8601 date string (ETA)
    estimatedDistance: z.number(),
    // meters
    speedLimit: z.number(),
    // km/h
    speedLimitWarning: z.boolean()
  })
});
var connectionStatusSchema = z.object({
  connected: z.boolean(),
  serverAddress: z.string().optional(),
  lastUpdate: z.number().optional()
});
var controlCommandSchema = z.object({
  command: z.enum([
    "toggle_engine",
    "toggle_electric",
    "toggle_lights_parking",
    "toggle_lights_beam_low",
    "toggle_lights_beam_high",
    "toggle_lights_beacon",
    "toggle_lights_aux_front",
    "toggle_lights_aux_roof",
    "horn_short",
    "horn_long",
    "toggle_cruise_control",
    "toggle_retarder",
    "toggle_differential_lock",
    "toggle_lift_axle",
    "toggle_trailer_lift_axle",
    "shift_up",
    "shift_down",
    "toggle_range_splitter"
  ]),
  value: z.boolean().optional()
});

// server/services/controls.ts
import { promisify } from "util";
import { execFile } from "child_process";
import * as fs2 from "fs";
import * as path2 from "path";
import * as os from "os";
var execFileAsync = promisify(execFile);
var defaultSequenceMap = {
  toggle_engine: [[["E"]].flat()],
  toggle_electric: [[["SHIFT", "E"]].flat()],
  toggle_lights_parking: [[["VK_F2"]].flat()],
  toggle_lights_beam_low: [[["VK_F3"]].flat()],
  toggle_lights_beam_high: [[["VK_F4"]].flat()],
  toggle_lights_beacon: [[["VK_F5"]].flat()],
  toggle_lights_aux_front: [[["VK_F6"]].flat()],
  toggle_lights_aux_roof: [[["VK_F7"]].flat()],
  horn_short: [[["H"]].flat()],
  horn_long: [[["SHIFT", "H"]].flat()],
  toggle_cruise_control: [[["C"]].flat()],
  toggle_retarder: [[["R"]].flat()],
  toggle_differential_lock: [[["D"]].flat()],
  toggle_lift_axle: [[["L"]].flat()],
  toggle_trailer_lift_axle: [[["SHIFT", "L"]].flat()],
  shift_up: [[["VK_UP"]].flat()],
  shift_down: [[["VK_DOWN"]].flat()],
  toggle_range_splitter: [[["S"]].flat()]
};
var overridesLoaded = false;
var overridesMap = {};
function tryLoadControlsOverrides() {
  if (overridesLoaded) return;
  overridesLoaded = true;
  try {
    const docs = path2.join(os.homedir(), "Documents", "Euro Truck Simulator 2", "profiles");
    if (!fs2.existsSync(docs)) return;
    const profileDirs = fs2.readdirSync(docs).map((d) => path2.join(docs, d)).filter((p) => fs2.statSync(p).isDirectory());
    let latestFile = null;
    let latestMtime = 0;
    for (const dir of profileDirs) {
      const f = path2.join(dir, "controls.sii");
      if (fs2.existsSync(f)) {
        const m = fs2.statSync(f).mtimeMs;
        if (m > latestMtime) {
          latestMtime = m;
          latestFile = f;
        }
      }
    }
    if (!latestFile) return;
    const text = fs2.readFileSync(latestFile, "utf8");
    overridesMap = parseControlsSii(text);
  } catch {
  }
}
function parseControlsSii(contents) {
  const result = {};
  const lines = contents.split(/\r?\n/);
  const actionToCommand = [
    [/engine.*(toggle|start|stop)/i, "toggle_engine"],
    [/(electric|electrical)/i, "toggle_electric"],
    [/parking.*light/i, "toggle_lights_parking"],
    [/(low.*beam|beam.*low)/i, "toggle_lights_beam_low"],
    [/(high.*beam|beam.*high)/i, "toggle_lights_beam_high"],
    [/beacon/i, "toggle_lights_beacon"],
    [/(aux.*front|front.*aux)/i, "toggle_lights_aux_front"],
    [/(aux.*roof|roof.*aux)/i, "toggle_lights_aux_roof"],
    [/(air.*horn|long.*horn)/i, "horn_long"],
    [/\bhorn\b/i, "horn_short"],
    [/cruise.*control/i, "toggle_cruise_control"],
    [/retarder/i, "toggle_retarder"],
    [/(diff.*lock|differential)/i, "toggle_differential_lock"],
    [/(lift.*trailer.*axle)/i, "toggle_trailer_lift_axle"],
    [/(lift.*axle)/i, "toggle_lift_axle"],
    [/(shift.*up|gear.*up)/i, "shift_up"],
    [/(shift.*down|gear.*down)/i, "shift_down"],
    [/(range.*split)/i, "toggle_range_splitter"]
  ];
  const extractKeys = (expr) => {
    const parts = expr.split(/\+/).map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/`/g, ""));
    const combo = [];
    for (const p of parts) {
      const m = /keyboard\.(.+)/i.exec(p) || /key\.(.+)/i.exec(p) || /(.+)/.exec(p);
      const token = (m?.[1] || p).toLowerCase();
      const t = token.replace(/\?.*$/, "").replace(/\s+/g, "");
      const mapped = mapTokenToVkName(t);
      if (!mapped) return null;
      combo.push(mapped);
    }
    if (combo.length === 0) return null;
    return [combo];
  };
  for (const line of lines) {
    const m = /\"mix\s+([^\"]+)\s+`([^`]+)`\"/i.exec(line);
    if (!m) continue;
    const action = m[1].toLowerCase();
    const expr = m[2];
    for (const [re, cmd] of actionToCommand) {
      if (re.test(action)) {
        const seq = extractKeys(expr);
        if (seq) result[cmd] = seq;
        break;
      }
    }
  }
  return result;
}
function mapTokenToVkName(token) {
  const t = token.toLowerCase();
  if (t.length === 1 && /[a-z0-9]/.test(t)) return t.toUpperCase();
  const map = {
    up: "VK_UP",
    down: "VK_DOWN",
    left: "VK_LEFT",
    right: "VK_RIGHT",
    lshift: "SHIFT",
    rshift: "SHIFT",
    shift: "SHIFT",
    lcontrol: "CTRL",
    rcontrol: "CTRL",
    control: "CTRL",
    lalt: "ALT",
    ralt: "ALT",
    alt: "ALT",
    f1: "VK_F1",
    f2: "VK_F2",
    f3: "VK_F3",
    f4: "VK_F4",
    f5: "VK_F5",
    f6: "VK_F6",
    f7: "VK_F7",
    f8: "VK_F8",
    f9: "VK_F9",
    f10: "VK_F10",
    f11: "VK_F11",
    f12: "VK_F12"
  };
  return map[t] || null;
}
function getSendKeysForCommand(command) {
  tryLoadControlsOverrides();
  return overridesMap[command] || defaultSequenceMap[command];
}
function loadControlsOverridesFromText(text) {
  try {
    const parsed = parseControlsSii(text);
    overridesMap = parsed;
    overridesLoaded = true;
    return Object.keys(parsed).length;
  } catch {
    return 0;
  }
}
async function sendKeysToEts2(sequence) {
  if (process.platform !== "win32") {
    throw new Error("Sending controls is only supported on Windows in this build.");
  }
  if (!sequence || sequence.length === 0) {
    throw new Error("Empty key sequence");
  }
  if (process.env.ETS2_USE_SENDKEYS === "1") {
    await sendKeysViaWScript(sequence);
    return;
  }
  const vkMap = {
    // Letters and digits
    ...Object.fromEntries("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c, i) => [c, 65 + i])),
    ...Object.fromEntries("0123456789".split("").map((c, i) => [c, 48 + i])),
    // Modifiers
    SHIFT: 16,
    CTRL: 17,
    ALT: 18,
    // Function keys
    VK_F1: 112,
    VK_F2: 113,
    VK_F3: 114,
    VK_F4: 115,
    VK_F5: 116,
    VK_F6: 117,
    VK_F7: 118,
    VK_F8: 119,
    VK_F9: 120,
    VK_F10: 121,
    VK_F11: 122,
    VK_F12: 123,
    // Arrows
    VK_UP: 38,
    VK_DOWN: 40,
    VK_LEFT: 37,
    VK_RIGHT: 39
  };
  const seqLiteral = JSON.stringify(sequence);
  const windowTitle = process.env.ETS2_WINDOW_TITLE || "Euro Truck Simulator 2";
  const ps = `
$ErrorActionPreference = 'Stop'
$wshell = New-Object -ComObject WScript.Shell
$null = $wshell.AppActivate('${windowTitle.replace(/'/g, "''")}')
Start-Sleep -Milliseconds 100

$code = @"
using System;
using System.Runtime.InteropServices;
public static class InputSender {
  [StructLayout(LayoutKind.Sequential)]
  struct INPUT { public uint type; public InputUnion U; }
  [StructLayout(LayoutKind.Explicit)]
  struct InputUnion { [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)]
  struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo; }
  const uint INPUT_KEYBOARD = 1;
  const uint KEYEVENTF_KEYUP = 0x0002;
  const uint KEYEVENTF_SCANCODE = 0x0008;
  const uint KEYEVENTF_UNICODE = 0x0004;
  [DllImport("user32.dll", SetLastError=true)]
  static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
  [DllImport("user32.dll", SetLastError=true)]
  static extern uint MapVirtualKey(uint uCode, uint uMapType);
  public static void KeyDownVk(ushort vk){ ushort sc = (ushort)MapVirtualKey(vk, 0); KeyDownScan(sc); }
  public static void KeyUpVk(ushort vk){ ushort sc = (ushort)MapVirtualKey(vk, 0); KeyUpScan(sc); }
  public static void KeyDownScan(ushort sc){ INPUT[] input = new INPUT[1]; input[0].type = INPUT_KEYBOARD; input[0].U.ki.wVk = 0; input[0].U.ki.wScan = sc; input[0].U.ki.dwFlags = KEYEVENTF_SCANCODE; input[0].U.ki.time = 0; input[0].U.ki.dwExtraInfo = UIntPtr.Zero; SendInput(1, input, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT))); }
  public static void KeyUpScan(ushort sc){ INPUT[] input = new INPUT[1]; input[0].type = INPUT_KEYBOARD; input[0].U.ki.wVk = 0; input[0].U.ki.wScan = sc; input[0].U.ki.dwFlags = KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP; input[0].U.ki.time = 0; input[0].U.ki.dwExtraInfo = UIntPtr.Zero; SendInput(1, input, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT))); }
  public static void SendUnicodeChar(ushort ch){ INPUT[] d = new INPUT[1]; d[0].type = INPUT_KEYBOARD; d[0].U.ki.wVk = 0; d[0].U.ki.wScan = ch; d[0].U.ki.dwFlags = KEYEVENTF_UNICODE; d[0].U.ki.time = 0; d[0].U.ki.dwExtraInfo = UIntPtr.Zero; SendInput(1, d, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT))); INPUT[] u = new INPUT[1]; u[0].type = INPUT_KEYBOARD; u[0].U.ki.wVk = 0; u[0].U.ki.wScan = ch; u[0].U.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP; u[0].U.ki.time = 0; u[0].U.ki.dwExtraInfo = UIntPtr.Zero; SendInput(1, u, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT))); }
}
"@

Add-Type -TypeDefinition $code -Language CSharp

$vk = @{}
${Object.keys(vkMap).map((k) => `$vk['${k}'] = ${vkMap[k]};`).join("\n")}

$json = @'
${seqLiteral}
'@
$sequence = $json | ConvertFrom-Json

# Ensure target window is active just before sending input
$null = $wshell.AppActivate('${windowTitle.replace(/'/g, "''")}')
Start-Sleep -Milliseconds 60

foreach ($combo in $sequence) {
  $modsList = @('SHIFT','CTRL','ALT')
  $mods = @()
  foreach ($k in $combo) { if ($modsList -contains $k) { $mods += $k } }

  # Press modifiers first
  foreach ($m in $mods) { [InputSender]::KeyDownVk([uint16]$vk[$m]) }

  $others = @()
  foreach ($k in $combo) { if (-not ($modsList -contains $k)) { $others += $k } }

  foreach ($key in $others) {
    if ($key -match '^[A-Z0-9]$' -and $mods.Count -eq 0) {
      # Use Unicode typing for plain characters so text apps show input
      [InputSender]::SendUnicodeChar([uint16][char]$key)
    } elseif ($vk.ContainsKey($key)) {
      [InputSender]::KeyDownVk([uint16]$vk[$key])
      Start-Sleep -Milliseconds 20
      [InputSender]::KeyUpVk([uint16]$vk[$key])
    }
  }

  # Release modifiers in reverse order
  for (($i = $mods.Count - 1); $i -ge 0; $i--) { [InputSender]::KeyUpVk([uint16]$vk[$mods[$i]]) }
  Start-Sleep -Milliseconds 30
}
`;
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    ps
  ], { windowsHide: true });
}
function tokenToSendKeys(t) {
  if (t === "VK_UP") return "{UP}";
  if (t === "VK_DOWN") return "{DOWN}";
  if (t === "VK_LEFT") return "{LEFT}";
  if (t === "VK_RIGHT") return "{RIGHT}";
  const fMatch = /^VK_F(\d+)$/.exec(t);
  if (fMatch) return `{F${fMatch[1]}}`;
  if (/^[A-Z0-9]$/.test(t)) return t;
  return null;
}
async function sendKeysViaWScript(sequence) {
  const windowTitle = process.env.ETS2_WINDOW_TITLE || "Euro Truck Simulator 2";
  const parts = [];
  for (const combo of sequence) {
    const mods = new Set(combo.filter((k) => k === "SHIFT" || k === "CTRL" || k === "ALT"));
    const others = combo.filter((k) => !(k === "SHIFT" || k === "CTRL" || k === "ALT"));
    const modPrefix = `${mods.has("SHIFT") ? "+" : ""}${mods.has("CTRL") ? "^" : ""}${mods.has("ALT") ? "%" : ""}`;
    if (others.length <= 1) {
      const token = others[0] ? tokenToSendKeys(others[0]) : "";
      parts.push(modPrefix + (token ?? ""));
    } else {
      const inner = others.map((k) => tokenToSendKeys(k) ?? "").join("");
      parts.push(modPrefix + `(${inner})`);
    }
  }
  const sendStr = parts.join(" ");
  const ps = `
$ErrorActionPreference = 'Stop'
$wshell = New-Object -ComObject WScript.Shell
$null = $wshell.AppActivate('${windowTitle.replace(/'/g, "''")}')
Start-Sleep -Milliseconds 150
$s = @'
${sendStr}
'@
$wshell.SendKeys($s)
`;
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    ps
  ], { windowsHide: true });
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.get("/api/telemetry", async (req, res) => {
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
  app2.post("/api/controls-overrides", (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Missing controls.sii content" });
      }
      const count = loadControlsOverridesFromText(content);
      res.json({ message: "Overrides loaded", mappings: count });
    } catch (error) {
      res.status(500).json({ message: "Failed to load overrides" });
    }
  });
  app2.get("/api/status", async (req, res) => {
    try {
      const status = await storage.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connection status" });
    }
  });
  app2.get("/api/telemetry-config", (req, res) => {
    try {
      const config = getTelemetryServerConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to get telemetry configuration" });
    }
  });
  app2.post("/api/telemetry-config", (req, res) => {
    try {
      const { baseUrl } = req.body;
      if (!baseUrl || typeof baseUrl !== "string") {
        return res.status(400).json({ message: "Base URL is required" });
      }
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
  app2.get("/api/user", async (req, res) => {
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
  app2.get("/api/users", async (_req, res) => {
    try {
      const users = await storage.listUsers();
      const result = users.map((u) => ({ id: u.id, username: u.username }));
      res.json({ users: result });
    } catch (error) {
      res.status(500).json({ message: "Failed to list users" });
    }
  });
  app2.delete("/api/users/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });
      await storage.deleteUser(userId);
      res.json({ message: "User deleted", userId });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  app2.get("/api/layouts/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });
      const layout = await storage.getUserLayout(userId);
      res.json({ userId, layout });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch layout" });
    }
  });
  app2.delete("/api/layouts/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });
      await storage.deleteUserLayout(userId);
      res.json({ message: "Layout deleted", userId });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete layout" });
    }
  });
  app2.post("/api/layouts/:userId", async (req, res) => {
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
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connectedClients = /* @__PURE__ */ new Set();
  wss.on("connection", (ws) => {
    console.log("Client connected to telemetry WebSocket");
    connectedClients.add(ws);
    ws.send(JSON.stringify({
      type: "connection_status",
      data: { connected: true, serverAddress: "localhost" }
    }));
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("Received message:", data);
        switch (data.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
          case "request_telemetry":
            sendLatestTelemetry(ws);
            break;
          case "control_command":
            handleControlCommand(data.data);
            break;
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });
    ws.on("close", () => {
      console.log("Client disconnected from telemetry WebSocket");
      connectedClients.delete(ws);
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      connectedClients.delete(ws);
    });
  });
  async function sendLatestTelemetry(ws) {
    try {
      const data = await storage.getLatestTelemetry();
      if (data && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "telemetry_data",
          data
        }));
      }
    } catch (error) {
      console.error("Error sending telemetry data:", error);
    }
  }
  function broadcastTelemetryData(data) {
    const message = JSON.stringify({
      type: "telemetry_data",
      data
    });
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  async function handleControlCommand(commandData) {
    try {
      const command = controlCommandSchema.parse(commandData);
      console.log("Processing control command:", command);
      const keys = getSendKeysForCommand(command.command);
      if (!keys) {
        throw new Error(`No key mapping for command: ${command.command}`);
      }
      await sendKeysToEts2(keys);
      const confirmationMessage = JSON.stringify({
        type: "command_confirmation",
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
      console.error("Error processing control command:", error);
      const errorMessage = JSON.stringify({
        type: "command_error",
        data: {
          error: "Command execution failed",
          message: error instanceof Error ? error.message : "Unknown error"
        }
      });
      connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(errorMessage);
        }
      });
    }
  }
  let telemetryInterval;
  const startTelemetryPolling = () => {
    telemetryInterval = setInterval(async () => {
      try {
        const telemetryData = await readTelemetryData();
        if (telemetryData) {
          const validatedData = telemetryDataSchema.parse(telemetryData);
          await storage.storeTelemetryData(validatedData);
          await storage.updateConnectionStatus({
            connected: true,
            lastUpdate: Date.now()
          });
          broadcastTelemetryData(validatedData);
        } else {
          await storage.updateConnectionStatus({
            connected: false,
            lastUpdate: Date.now()
          });
        }
      } catch (error) {
        console.error("Error in telemetry polling:", error);
        await storage.updateConnectionStatus({
          connected: false,
          lastUpdate: Date.now()
        });
      }
    }, 100);
  };
  startTelemetryPolling();
  process.on("SIGINT", () => {
    if (telemetryInterval) {
      clearInterval(telemetryInterval);
    }
    connectedClients.forEach((client) => {
      client.close();
    });
    console.log("Telemetry server shutting down...");
    process.exit(0);
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
