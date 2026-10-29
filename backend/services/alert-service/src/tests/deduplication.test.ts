import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createLogger } from "@vehicle-pulse/logger";
import { connectMySQL, disconnectMySQL, getPrismaClient } from "../app/db/prisma.js";
import { evaluateAndPersistTelemetryAlerts } from "../app/services/alertEvaluator.service.js";
import type { TelemetryRawEvent } from "@vehicle-pulse/event-contracts";

const testLogger = createLogger({ serviceName: "test-dedup", level: "silent" });

const createTelemetryEvent = (vehicleId: string, speed: number, timestamp: string): TelemetryRawEvent => ({
  eventId: `evt_${Date.now()}_${Math.random()}`,
  eventType: "telemetry.raw",
  timestamp,
  vehicleId,
  deviceId: "obd_test_device",
  version: "1.0.0",
  data: {
    location: { latitude: 40.7128, longitude: -74.006, heading: 90 },
    speed,
    rpm: 3200,
    fuelLevelPercent: 50.0,
    engineTemperatureCelsius: 90.0,
    batteryVoltage: 13.5,
    odometerKm: 15000,
    engineStatus: "ON",
    accelerationG: 0.05,
  },
});

describe("Phase 18 — Alert Deduplication & Cooldown Suite", () => {
  const prisma = getPrismaClient();

  before(async () => {
    await connectMySQL(testLogger);
  });

  after(async () => {
    await disconnectMySQL(testLogger);
  });

  it("should create only ONE open alert ticket for rapid repeated speeding pings and append events", async () => {
    const vehicleId = `veh_dedup_${Date.now()}`;
    const baseTime = new Date("2026-10-29T12:00:00.000Z");

    // Ping 1: First violation (130 km/h at 12:00:00)
    const event1 = createTelemetryEvent(vehicleId, 130.0, baseTime.toISOString());
    const count1 = await evaluateAndPersistTelemetryAlerts(prisma, event1, testLogger);
    assert.ok(count1 >= 1);

    // Ping 2: Second violation 10 seconds later (135 km/h at 12:00:10)
    const event2 = createTelemetryEvent(vehicleId, 135.0, new Date(baseTime.getTime() + 10000).toISOString());
    const count2 = await evaluateAndPersistTelemetryAlerts(prisma, event2, testLogger);
    assert.ok(count2 >= 1);

    // Ping 3: Third violation 20 seconds later (140 km/h at 12:00:20)
    const event3 = createTelemetryEvent(vehicleId, 140.0, new Date(baseTime.getTime() + 20000).toISOString());
    const count3 = await evaluateAndPersistTelemetryAlerts(prisma, event3, testLogger);
    assert.ok(count3 >= 1);

    // Verify database state: Exactly 1 Alert record created for this vehicle
    const alerts = await prisma.alert.findMany({
      where: { vehicleId },
      include: { events: true },
    });

    assert.equal(alerts.length, 1, "Must have exactly 1 Alert record (no duplicate spam)");
    assert.equal(alerts[0].status, "OPEN");
    assert.equal(alerts[0].triggerValue, 140.0, "Should record latest peak trigger value");

    // Verify events: Must have 3 audit records (1 initial trigger + 2 cooldown triggers)
    assert.equal(alerts[0].events.length, 3, "Must have all 3 event occurrences recorded for audit");
  });
});
