import type { TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import type { EvaluatedRule, RuleEvaluationResult, RuleViolation } from "./ruleTypes.js";

/**
 * Pure & Transport-Agnostic Rules Engine
 * Evaluates raw telemetry payloads against configured rules without side effects.
 */
export class AlertRulesEngine {
  /**
   * Evaluate a telemetry event against an active set of rules.
   */
  public static evaluate(
    event: TelemetryRawEvent,
    rules: EvaluatedRule[]
  ): RuleEvaluationResult {
    const violations: RuleViolation[] = [];
    const vehicleId = event.vehicleId;
    const timestamp = event.timestamp;

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const violation = this.evaluateSingleRule(rule, event);
      if (violation) {
        violations.push(violation);
      }
    }

    return {
      vehicleId,
      eventId: event.eventId,
      timestamp,
      hasViolations: violations.length > 0,
      violations,
    };
  }

  private static evaluateSingleRule(
    rule: EvaluatedRule,
    event: TelemetryRawEvent
  ): RuleViolation | null {
    const data = event.data;
    const vehicleId = event.vehicleId;
    const timestamp = event.timestamp;
    const latitude = data.location?.latitude;
    const longitude = data.location?.longitude;

    // Stable composite deduplication key: vehicle + conditionType
    const deduplicationKey = `${vehicleId}:${rule.conditionType}`;

    switch (rule.conditionType) {
      case "SPEED_LIMIT": {
        if (typeof data.speed === "number" && data.speed > rule.thresholdValue) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            conditionType: rule.conditionType,
            severity: rule.severity,
            triggerValue: data.speed,
            thresholdValue: rule.thresholdValue,
            message: `Vehicle speed ${data.speed.toFixed(1)} km/h exceeded limit ${rule.thresholdValue} km/h`,
            timestamp,
            latitude,
            longitude,
            deduplicationKey,
            cooldownSecs: rule.cooldownSecs,
          };
        }
        break;
      }

      case "ENGINE_TEMP": {
        if (
          typeof data.engineTemperatureCelsius === "number" &&
          data.engineTemperatureCelsius > rule.thresholdValue
        ) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            conditionType: rule.conditionType,
            severity: rule.severity,
            triggerValue: data.engineTemperatureCelsius,
            thresholdValue: rule.thresholdValue,
            message: `Engine temperature ${data.engineTemperatureCelsius.toFixed(1)} °C exceeded safe limit ${rule.thresholdValue} °C`,
            timestamp,
            latitude,
            longitude,
            deduplicationKey,
            cooldownSecs: rule.cooldownSecs,
          };
        }
        break;
      }

      case "BATTERY_VOLTAGE": {
        if (
          typeof data.batteryVoltage === "number" &&
          data.batteryVoltage < rule.thresholdValue
        ) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            conditionType: rule.conditionType,
            severity: rule.severity,
            triggerValue: data.batteryVoltage,
            thresholdValue: rule.thresholdValue,
            message: `Low battery voltage ${data.batteryVoltage.toFixed(2)} V below threshold ${rule.thresholdValue} V`,
            timestamp,
            latitude,
            longitude,
            deduplicationKey,
            cooldownSecs: rule.cooldownSecs,
          };
        }
        break;
      }

      case "HARSH_BRAKING": {
        if (
          typeof data.accelerationG === "number" &&
          data.accelerationG <= rule.thresholdValue
        ) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            conditionType: rule.conditionType,
            severity: rule.severity,
            triggerValue: data.accelerationG,
            thresholdValue: rule.thresholdValue,
            message: `Harsh braking deceleration ${data.accelerationG.toFixed(2)} G detected`,
            timestamp,
            latitude,
            longitude,
            deduplicationKey,
            cooldownSecs: rule.cooldownSecs,
          };
        }
        break;
      }

      case "EXTREME_ACCELERATION": {
        if (
          typeof data.accelerationG === "number" &&
          data.accelerationG >= rule.thresholdValue
        ) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            conditionType: rule.conditionType,
            severity: rule.severity,
            triggerValue: data.accelerationG,
            thresholdValue: rule.thresholdValue,
            message: `Extreme acceleration ${data.accelerationG.toFixed(2)} G detected`,
            timestamp,
            latitude,
            longitude,
            deduplicationKey,
            cooldownSecs: rule.cooldownSecs,
          };
        }
        break;
      }

      case "LOW_FUEL": {
        if (
          typeof data.fuelLevelPercent === "number" &&
          data.fuelLevelPercent <= rule.thresholdValue
        ) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            conditionType: rule.conditionType,
            severity: rule.severity,
            triggerValue: data.fuelLevelPercent,
            thresholdValue: rule.thresholdValue,
            message: `Critically low fuel level ${data.fuelLevelPercent.toFixed(1)}% (Threshold: ${rule.thresholdValue}%)`,
            timestamp,
            latitude,
            longitude,
            deduplicationKey,
            cooldownSecs: rule.cooldownSecs,
          };
        }
        break;
      }

      default:
        break;
    }

    return null;
  }
}
