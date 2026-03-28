// Centralized units/types/presets and helpers
// Now using compact choice schema persisted in settings.json

import { type MeasurementUnitsChoice as MUChoice, getSettings } from "@/app/tauri-bridge";
import { LANGUAGE_OPTIONS, type LanguageCode, defaultLanguage } from "@/lib/language";

export type DistanceChoice = MUChoice["distance"];
export type SpeedChoice = MUChoice["speed"];
export type AccelChoice = MUChoice["acceleration"];
export type TemperatureChoice = MUChoice["temperature"];
export type PressureChoice = MUChoice["pressure"];
export type TorqueChoice = MUChoice["torque"];
export type PowerChoice = MUChoice["power"];
export type FuelVolumeChoice = MUChoice["fuel_volume"];
export type SuspensionTravelChoice = MUChoice["suspension_travel"];
export type TirePressureChoice = MUChoice["tire_pressure"];
export type FuelConsumptionChoice = MUChoice["fuel_consumption"];

export type MeasurementUnitsChoice = MUChoice;
export type UnitsMode = "custom" | "imperial" | "metric";

export const CHOICE_METRIC: MeasurementUnitsChoice = {
  distance: "metric",
  speed: "metric",
  acceleration: "metric",
  temperature: "celsius",
  pressure: "bar",
  torque: "nm",
  power: "hp",
  fuel_volume: "metric",
  suspension_travel: "mm",
  tire_pressure: "bar",
  fuel_consumption: "metric",
};

export const CHOICE_IMPERIAL: MeasurementUnitsChoice = {
  distance: "imperial",
  speed: "imperial",
  acceleration: "imperial",
  temperature: "fahrenheit",
  pressure: "psi",
  torque: "lb-ft",
  power: "hp",
  fuel_volume: "imperial",
  suspension_travel: "in",
  tire_pressure: "psi",
  fuel_consumption: "imperial",
};

export function inferUnitsModeFromChoice(units: MeasurementUnitsChoice): UnitsMode {
  const isMetric = JSON.stringify(units) === JSON.stringify(CHOICE_METRIC);
  const isImperial = JSON.stringify(units) === JSON.stringify(CHOICE_IMPERIAL);
  return isMetric ? "metric" : isImperial ? "imperial" : "custom";
}

// Supported language options (re-export)
export { LANGUAGE_OPTIONS };

// Helper to get active settings (language + units choices)
export interface ActiveUnitsInfo {
  language: LanguageCode;
  units: MeasurementUnitsChoice;
  mode: UnitsMode;
}

export async function getActiveUnitsInfo(): Promise<ActiveUnitsInfo> {
  const s = await getSettings();
  const language = (s?.language || defaultLanguage) as LanguageCode;
  const units = s?.measurement_units || CHOICE_METRIC;
  const mode = inferUnitsModeFromChoice(units);
  return { language, units, mode };
}
