import SpeedWidget from "./speed";
import RpmWidget from "./rpm";
import FuelWidget from "./fuel";
import NavigationWidget from "./navigation";
import React from "react";
import { TelemetryData } from "@shared/schema";

export type WidgetSettings = Record<string, any>;
export type WidgetComponent = React.FC<{ telemetry: TelemetryData | null; settings?: WidgetSettings }>;

export const registry: Record<string, WidgetComponent> = {
  speed: SpeedWidget,
  rpm: RpmWidget,
  fuel: FuelWidget,
  navigation: NavigationWidget,
};

export const availableWidgetTypes = [
  { type: 'speed', title: 'Speed' },
  { type: 'rpm', title: 'Engine RPM' },
  { type: 'fuel', title: 'Fuel' },
  { type: 'navigation', title: 'Navigation' },
];
