import type { EvaluatedRule } from "./ruleTypes.js";

/**
 * Standard Fleet Default Rules
 * Can be overridden by user-created rules in MySQL
 */
export const DEFAULT_RULES: EvaluatedRule[] = [
  {
    id: "default-rule-speed",
    name: "Speeding Violation",
    conditionType: "SPEED_LIMIT",
    thresholdValue: 120.0, // km/h
    severity: "HIGH",
    enabled: true,
    cooldownSecs: 300, // 5 minutes deduplication window
  },
  {
    id: "default-rule-engine-temp",
    name: "Engine Overheating Warning",
    conditionType: "ENGINE_TEMP",
    thresholdValue: 110.0, // °C
    severity: "CRITICAL",
    enabled: true,
    cooldownSecs: 300,
  },
  {
    id: "default-rule-battery-voltage",
    name: "Low Battery Voltage",
    conditionType: "BATTERY_VOLTAGE",
    thresholdValue: 11.5, // Volts
    severity: "MEDIUM",
    enabled: true,
    cooldownSecs: 600, // 10 minutes
  },
  {
    id: "default-rule-harsh-braking",
    name: "Harsh Braking Event",
    conditionType: "HARSH_BRAKING",
    thresholdValue: -0.45, // <= -0.45 G deceleration or rapid speed reduction
    severity: "HIGH",
    enabled: true,
    cooldownSecs: 60, // 1 minute
  },
  {
    id: "default-rule-extreme-accel",
    name: "Extreme Acceleration",
    conditionType: "EXTREME_ACCELERATION",
    thresholdValue: 0.40, // >= 0.40 G acceleration
    severity: "MEDIUM",
    enabled: true,
    cooldownSecs: 60,
  },
  {
    id: "default-rule-low-fuel",
    name: "Critical Low Fuel Warning",
    conditionType: "LOW_FUEL",
    thresholdValue: 10.0, // <= 10% fuel
    severity: "HIGH",
    enabled: true,
    cooldownSecs: 900, // 15 minutes
  },
];
