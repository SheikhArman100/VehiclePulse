import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AlertRulesEngine } from "../app/rules/rulesEngine.js";
import { DEFAULT_RULES } from "../app/rules/defaultRules.js";
import type { TelemetryRawEvent } from "@vehicle-pulse/event-contracts";

const createMockEvent = (overrides: Partial<TelemetryRawEvent["data"]> = {}): TelemetryRawEvent => ({
  eventId: "mock-evt-101",
  eventType: "telemetry.raw",
  timestamp: new Date().toISOString(),
  vehicleId: "veh_test_engine",
  deviceId: "obd_device_999",
  version: "1.0.0",
  data: {
    location: {
      latitude: 40.7128,
      longitude: -74.006,
      heading: 180,
    },
    speed: 75.0,
    rpm: 2500,
    fuelLevelPercent: 65.0,
    engineTemperatureCelsius: 90.0,
    batteryVoltage: 13.8,
    odometerKm: 12500.0,
    engineStatus: "ON",
    accelerationG: 0.05,
    ...overrides,
  },
});

describe("Phase 18 — Alert Rules Engine Unit Suite", () => {
  it("should detect speeding violation when speed > 120 km/h", () => {
    const event = createMockEvent({ speed: 132.5 });
    const result = AlertRulesEngine.evaluate(event, DEFAULT_RULES);

    assert.equal(result.hasViolations, true);
    const speedViolation = result.violations.find((v) => v.conditionType === "SPEED_LIMIT");
    assert.ok(speedViolation, "Should trigger SPEED_LIMIT rule");
    assert.equal(speedViolation.triggerValue, 132.5);
    assert.equal(speedViolation.thresholdValue, 120.0);
    assert.equal(speedViolation.severity, "HIGH");
  });

  it("should not trigger speeding violation at or below threshold", () => {
    const eventBoundary = createMockEvent({ speed: 120.0 });
    const resultBoundary = AlertRulesEngine.evaluate(eventBoundary, DEFAULT_RULES);
    assert.equal(resultBoundary.violations.some((v) => v.conditionType === "SPEED_LIMIT"), false);

    const eventNormal = createMockEvent({ speed: 90.0 });
    const resultNormal = AlertRulesEngine.evaluate(eventNormal, DEFAULT_RULES);
    assert.equal(resultNormal.violations.some((v) => v.conditionType === "SPEED_LIMIT"), false);
  });

  it("should detect engine overheating when temp > 110 °C", () => {
    const event = createMockEvent({ engineTemperatureCelsius: 114.2 });
    const result = AlertRulesEngine.evaluate(event, DEFAULT_RULES);

    assert.equal(result.hasViolations, true);
    const tempViolation = result.violations.find((v) => v.conditionType === "ENGINE_TEMP");
    assert.ok(tempViolation);
    assert.equal(tempViolation.severity, "CRITICAL");
    assert.equal(tempViolation.triggerValue, 114.2);
  });

  it("should detect low battery voltage when voltage < 11.5 V", () => {
    const event = createMockEvent({ batteryVoltage: 11.1 });
    const result = AlertRulesEngine.evaluate(event, DEFAULT_RULES);

    assert.equal(result.hasViolations, true);
    const batteryViolation = result.violations.find((v) => v.conditionType === "BATTERY_VOLTAGE");
    assert.ok(batteryViolation);
    assert.equal(batteryViolation.severity, "MEDIUM");
    assert.equal(batteryViolation.triggerValue, 11.1);
  });

  it("should detect harsh braking when accelerationG <= -0.45 G", () => {
    const event = createMockEvent({ accelerationG: -0.62 });
    const result = AlertRulesEngine.evaluate(event, DEFAULT_RULES);

    assert.equal(result.hasViolations, true);
    const brakeViolation = result.violations.find((v) => v.conditionType === "HARSH_BRAKING");
    assert.ok(brakeViolation);
    assert.equal(brakeViolation.severity, "HIGH");
  });

  it("should detect extreme acceleration when accelerationG >= 0.40 G", () => {
    const event = createMockEvent({ accelerationG: 0.55 });
    const result = AlertRulesEngine.evaluate(event, DEFAULT_RULES);

    assert.equal(result.hasViolations, true);
    const accelViolation = result.violations.find((v) => v.conditionType === "EXTREME_ACCELERATION");
    assert.ok(accelViolation);
    assert.equal(accelViolation.severity, "MEDIUM");
  });

  it("should detect critical low fuel level <= 10%", () => {
    const event = createMockEvent({ fuelLevelPercent: 8.5 });
    const result = AlertRulesEngine.evaluate(event, DEFAULT_RULES);

    assert.equal(result.hasViolations, true);
    const fuelViolation = result.violations.find((v) => v.conditionType === "LOW_FUEL");
    assert.ok(fuelViolation);
    assert.equal(fuelViolation.severity, "HIGH");
  });

  it("should evaluate multiple concurrent violations on a single telemetry ping", () => {
    const event = createMockEvent({
      speed: 135.0,
      engineTemperatureCelsius: 118.0,
      fuelLevelPercent: 6.0,
    });
    const result = AlertRulesEngine.evaluate(event, DEFAULT_RULES);

    assert.equal(result.hasViolations, true);
    assert.equal(result.violations.length, 3);
  });

  it("should ignore disabled rules", () => {
    const modifiedRules = DEFAULT_RULES.map((r) =>
      r.conditionType === "SPEED_LIMIT" ? { ...r, enabled: false } : r
    );

    const event = createMockEvent({ speed: 145.0 });
    const result = AlertRulesEngine.evaluate(event, modifiedRules);

    assert.equal(result.violations.some((v) => v.conditionType === "SPEED_LIMIT"), false);
  });
});
