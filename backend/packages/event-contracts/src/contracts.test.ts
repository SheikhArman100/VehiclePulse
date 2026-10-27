import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TelemetryRawEventSchema,
  AlertTriggeredEventSchema,
  CommandDispatchedEventSchema,
  VehicleStateUpdatedEventSchema,
} from "./index.js";

describe("Event Contracts Validation Suite", () => {
  it("should validate a compliant TelemetryRawEvent", () => {
    const validEvent = {
      eventId: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
      eventType: "telemetry.raw",
      version: "1.0.0",
      vehicleId: "veh-test-001",
      deviceId: "dev-obd-999",
      timestamp: "2026-10-27T12:00:00.000Z",
      data: {
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          heading: 180,
          altitude: 15.5,
        },
        speed: 65.4,
        rpm: 2400,
        fuelLevelPercent: 78.5,
        engineTemperatureCelsius: 88,
        batteryVoltage: 13.8,
        odometerKm: 45210.3,
        engineStatus: "ON",
        accelerationG: 0.12,
      },
    };

    const parsed = TelemetryRawEventSchema.safeParse(validEvent);
    assert.equal(parsed.success, true);
  });

  it("should reject TelemetryRawEvent with invalid UUID or coordinates", () => {
    const invalidEvent = {
      eventId: "not-a-valid-uuid",
      eventType: "telemetry.raw",
      version: "1.0.0",
      vehicleId: "veh-001",
      deviceId: "dev-001",
      timestamp: "2026-10-27T12:00:00.000Z",
      data: {
        location: {
          latitude: 95.0, // Invalid: exceeds max 90
          longitude: -122.4194,
        },
        speed: -5, // Invalid: negative speed
        rpm: 2400,
        fuelLevelPercent: 120, // Invalid: exceeds 100
        engineTemperatureCelsius: 90,
        batteryVoltage: 12,
        odometerKm: 100,
      },
    };

    const parsed = TelemetryRawEventSchema.safeParse(invalidEvent);
    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(parsed.error.errors.length >= 3);
    }
  });

  it("should validate an AlertTriggeredEvent", () => {
    const validAlert = {
      eventId: "b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e",
      eventType: "alert.triggered",
      version: "1.0.0",
      vehicleId: "veh-test-002",
      deviceId: "dev-obd-888",
      timestamp: "2026-10-27T12:05:00.000Z",
      data: {
        alertId: "c3d4e5f6-a1b2-4c3d-ae4f-5a6b7c8d9e0f",
        ruleId: "rule-overspeed-120",
        ruleName: "Excessive Speed Limit",
        severity: "HIGH",
        status: "OPEN",
        metric: "speed",
        currentValue: 135.2,
        thresholdValue: 120.0,
        message: "Vehicle exceeded threshold of 120 km/h with 135.2 km/h",
      },
    };

    const parsed = AlertTriggeredEventSchema.safeParse(validAlert);
    assert.equal(parsed.success, true);
  });

  it("should validate a CommandDispatchedEvent", () => {
    const validCommand = {
      eventId: "d4e5f6a1-b2c3-4d4e-bf5a-6b7c8d9e0f1a",
      eventType: "command.dispatched",
      version: "1.0.0",
      vehicleId: "veh-test-003",
      deviceId: "dev-obd-777",
      timestamp: "2026-10-27T12:10:00.000Z",
      data: {
        commandId: "e5f6a1b2-c3d4-4e5f-a012-7b8c9d0e1f2a",
        commandType: "LOCK_DOORS",
        status: "PENDING",
        timeoutSeconds: 45,
      },
    };

    const parsed = CommandDispatchedEventSchema.safeParse(validCommand);
    assert.equal(parsed.success, true);
  });

  it("should validate a VehicleStateUpdatedEvent", () => {
    const validState = {
      eventId: "f6a1b2c3-d4e5-4f6a-b123-8c9d0e1f2a3b",
      eventType: "vehicle.state.updated",
      version: "1.0.0",
      vehicleId: "veh-test-004",
      deviceId: "dev-obd-666",
      timestamp: "2026-10-27T12:15:00.000Z",
      data: {
        status: "ONLINE",
        lastSeen: "2026-10-27T12:15:00.000Z",
        activeAlertCount: 0,
        latestTelemetry: {
          location: {
            latitude: 40.7128,
            longitude: -74.006,
            heading: 90,
          },
          speed: 45.0,
          rpm: 1800,
          fuelLevelPercent: 50.0,
          engineTemperatureCelsius: 85,
          batteryVoltage: 14.1,
          odometerKm: 21500,
          engineStatus: "ON",
        },
      },
    };

    const parsed = VehicleStateUpdatedEventSchema.safeParse(validState);
    assert.equal(parsed.success, true);
  });
});
