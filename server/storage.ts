import fs from "fs";
import path from "path";

// Use simple aliases for types to avoid import path issues here
export type TelemetryData = any;
export type ConnectionStatus = { connected: boolean; lastUpdate?: number | undefined };

export interface IStorage {
  // Keep existing user methods
  getUser(id: number): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;
  listUsers(): Promise<any[]>;
  deleteUser(id: number): Promise<void>;
  
  // Telemetry methods
  getLatestTelemetry(): Promise<TelemetryData | null>;
  storeTelemetryData(data: TelemetryData): Promise<void>;
  getConnectionStatus(): Promise<ConnectionStatus>;
  updateConnectionStatus(status: ConnectionStatus): Promise<void>;

  // Layout methods for customizable dashboard
  getUserLayout(userId: number): Promise<any | null>;
  saveUserLayout(userId: number, layout: any): Promise<void>;
  // User listing
  listUsers(): Promise<any[]>;
  // Delete user and layout
  deleteUser(userId: number): Promise<void>;
  deleteUserLayout(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private currentId: number;
  private latestTelemetry: TelemetryData | null = null;
  private connectionStatus: ConnectionStatus = {
    connected: false,
    lastUpdate: undefined,
  };
  private layouts: Map<number, any> = new Map();
  private dataDir: string;
  private usersFile: string;
  private usersCache: Record<string, any> = {};

  constructor() {
    this.users = new Map();
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
        const ids = Object.keys(this.usersCache).map((k) => Number(k)).filter(n => !Number.isNaN(n));
        if (ids.length) this.currentId = Math.max(...ids) + 1;
      } catch {
        this.usersCache = {};
      }
    } else {
      fs.writeFileSync(this.usersFile, JSON.stringify({}), "utf8");
    }
  }

  async getUser(id: number): Promise<any> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: any): Promise<any> {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    this.usersCache[String(id)] = user;
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(this.usersCache, null, 2), "utf8");
    } catch {}
    return user;
  }

  async getLatestTelemetry(): Promise<TelemetryData | null> {
    return this.latestTelemetry;
  }

  async storeTelemetryData(data: TelemetryData): Promise<void> {
    this.latestTelemetry = data;
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return this.connectionStatus;
  }

  async updateConnectionStatus(status: ConnectionStatus): Promise<void> {
    this.connectionStatus = status;
  }

  async getUserLayout(userId: number): Promise<any | null> {
    return this.layouts.get(userId) ?? null;
  }

  async saveUserLayout(userId: number, layout: any): Promise<void> {
    this.layouts.set(userId, layout);
  }

  async listUsers(): Promise<any[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(userId: number): Promise<void> {
    this.users.delete(userId);
    delete this.usersCache[String(userId)];
    // also remove any in-memory layout for this user
    try {
      this.layouts.delete(userId);
    } catch {}
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(this.usersCache, null, 2), "utf8");
    } catch {}
  }

  async deleteUserLayout(userId: number): Promise<void> {
    this.layouts.delete(userId);
  }
}

/**
 * Simple file-backed storage for layouts.
 * Only persists layouts to avoid adding DB dependencies.
 */
export class FileStorage implements IStorage {
  private users: Map<number, any> = new Map();
  private currentId = 1;
  private latestTelemetry: TelemetryData | null = null;
  private connectionStatus: ConnectionStatus = {
    connected: false,
    lastUpdate: undefined,
  };
  private dataDir: string;
  private layoutsFile: string;
  private layoutsCache: Record<string, any> = {};
  private usersFile: string;
  private usersCache: Record<string, any> = {};

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

    // load or initialize users file
    if (fs.existsSync(this.usersFile)) {
      try {
        this.usersCache = JSON.parse(fs.readFileSync(this.usersFile, "utf8") || "{}");
        // populate this.users map from cache
        Object.keys(this.usersCache).forEach((k) => {
          const u = this.usersCache[k];
          const id = Number(k);
          if (!Number.isNaN(id)) this.users.set(id, u);
        });
        // set currentId to max existing id + 1
        const ids = Object.keys(this.usersCache).map((k) => Number(k)).filter(n => !Number.isNaN(n));
        if (ids.length) this.currentId = Math.max(...ids) + 1;
      } catch {
        this.usersCache = {};
      }
    } else {
      fs.writeFileSync(this.usersFile, JSON.stringify({}), "utf8");
    }
  }

  private persistLayouts() {
    fs.writeFileSync(this.layoutsFile, JSON.stringify(this.layoutsCache, null, 2), "utf8");
  }

  private persistUsers() {
    // build usersCache from this.users map
    const out: Record<string, any> = {};
    this.users.forEach((v, k) => { out[String(k)] = v; });
    fs.writeFileSync(this.usersFile, JSON.stringify(out, null, 2), "utf8");
  }

  async getUser(id: number): Promise<any> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: any): Promise<any> {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    // persist to users file
    this.usersCache[String(id)] = user;
    try {
      this.persistUsers();
    } catch {}
    return user;
  }

  async getLatestTelemetry(): Promise<TelemetryData | null> {
    return this.latestTelemetry;
  }

  async storeTelemetryData(data: TelemetryData): Promise<void> {
    this.latestTelemetry = data;
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return this.connectionStatus;
  }

  async updateConnectionStatus(status: ConnectionStatus): Promise<void> {
    this.connectionStatus = status;
  }

  async getUserLayout(userId: number): Promise<any | null> {
    return this.layoutsCache[String(userId)] ?? null;
  }

  async saveUserLayout(userId: number, layout: any): Promise<void> {
    this.layoutsCache[String(userId)] = layout;
    this.persistLayouts();
  }

  async listUsers(): Promise<any[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(userId: number): Promise<void> {
    this.users.delete(userId);
    delete this.usersCache[String(userId)];
    // also remove persisted layout for this user
    try {
      delete this.layoutsCache[String(userId)];
      this.persistLayouts();
    } catch {}
    try {
      this.persistUsers();
    } catch {}
  }

  async deleteUserLayout(userId: number): Promise<void> {
    delete this.layoutsCache[String(userId)];
    this.persistLayouts();
  }
}

// Choose storage implementation via env var PERSISTENT_STORAGE=file
export const storage: IStorage =
  process.env.PERSISTENT_STORAGE === "file" ? new FileStorage() : new MemStorage();
