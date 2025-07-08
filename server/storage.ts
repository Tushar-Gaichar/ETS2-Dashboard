import { TelemetryData, ConnectionStatus } from "@shared/schema";

export interface IStorage {
  // Keep existing user methods
  getUser(id: number): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;
  
  // Add telemetry methods
  getLatestTelemetry(): Promise<TelemetryData | null>;
  storeTelemetryData(data: TelemetryData): Promise<void>;
  getConnectionStatus(): Promise<ConnectionStatus>;
  updateConnectionStatus(status: ConnectionStatus): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private currentId: number;
  private latestTelemetry: TelemetryData | null = null;
  private connectionStatus: ConnectionStatus = {
    connected: false,
    lastUpdate: undefined,
  };

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<any> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<any> {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
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
}

export const storage = new MemStorage();
