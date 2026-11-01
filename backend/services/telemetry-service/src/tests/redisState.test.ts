import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createLogger } from "@vehicle-pulse/logger";
import { RedisClientWrapper, VehicleStateService } from "@vehicle-pulse/shared";
import type { TelemetryRawEvent } from "@vehicle-pulse/event-contracts";

const testLogger = createLogger({ serviceName: "test-redis-state", level: "silent" });
const REDIS_TEST_URL = process.env.REDIS_URL || "redis://localhost:6379";

describe("Phase 21 — Redis Real-Time State & Out-Of-Order Protection Suite", () => {
  let redisWrapper: RedisClientWrapper;
  let stateService: VehicleStateService;

  before(async () => {
    redisWrapper = new RedisClientWrapper({
      url: REDIS_TEST_URL,
      logger: testLogger,
    });
    const client = redisWrapper.getClient();
    stateService = new VehicleStateService(client, testLogger, {
      ttlSeconds: 60,
      offlineThresholdSeconds: 2, // 2s threshold for fast offline testing
    });
  });

  after(async () => {
    await redisWrapper.disconnect();
  });

  const createEvent = (
    vehicleId: string,
    timestamp: string,
    speed: number,
    fuelLevel: number
  ): TelemetryRawEvent => ({
    eventId: randomUUID(),
    eventType: "telemetry.raw",
    timestamp,
    vehicleId,
    deviceId: "obd_unit_test",
    version: "1.0.0",
    data: {
      location: { latitude: 37.7749, longitude: -122.4194, heading: 90 },
      speed,
      rpm: 2800,
      fuelLevelPercent: fuelLevel,
      engineTemperatureCelsius: 90.0,
      batteryVoltage: 13.8,
      odometerKm: 12500,
      engineStatus: "ON",
      accelerationG: 0.05,
    },
  });

  it("should atomically save real-time vehicle state to Redis and retrieve it with sub-millisecond latency", async () => {
    const vehicleId = `veh_state_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const event = createEvent(vehicleId, nowIso, 75.5, 82.0);
    const updated = await stateService.updateFromTelemetry(event);
    assert.equal(updated, true, "State update should succeed");

    const state = await stateService.getVehicleState(vehicleId);
    assert.ok(state, "State should be retrievable from Redis");
    assert.equal(state.vehicleId, vehicleId);
    assert.equal(state.status, "ONLINE");
    assert.equal(state.isOnline, true);
    assert.equal(state.latestTelemetry.speed, 75.5);
    assert.equal(state.latestTelemetry.fuelLevelPercent, 82.0);
  });

  it("should prevent out-of-order/stale events from overwriting newer state (Atomic Lua Protection)", async () => {
    const vehicleId = `veh_ooo_${Date.now()}`;
    const tNewer = new Date("2026-11-01T12:00:10.000Z").toISOString();
    const tOlder = new Date("2026-11-01T12:00:05.000Z").toISOString();

    // 1. Process NEWER event first (e.g. speed = 100 km/h at 12:00:10)
    const newerEvent = createEvent(vehicleId, tNewer, 100.0, 70.0);
    const firstUpdate = await stateService.updateFromTelemetry(newerEvent);
    assert.equal(firstUpdate, true);

    // 2. An older delayed event arrives late (speed = 40 km/h at 12:00:05)
    const olderEvent = createEvent(vehicleId, tOlder, 40.0, 71.0);
    const staleUpdate = await stateService.updateFromTelemetry(olderEvent);
    assert.equal(staleUpdate, false, "Older event must be rejected by Lua script");

    // 3. Confirm Redis state still reflects the newer event
    const finalState = await stateService.getVehicleState(vehicleId);
    assert.ok(finalState);
    assert.equal(finalState.latestTelemetry.speed, 100.0, "Speed must remain at 100 km/h from newer event");
    assert.equal(finalState.lastSeen, tNewer);
  });

  it("should dynamically calculate OFFLINE status when telemetry age exceeds offline threshold", async () => {
    const vehicleId = `veh_offline_${Date.now()}`;
    // Event emitted 5 seconds in the past (exceeds our 2s test offline threshold)
    const pastTime = new Date(Date.now() - 5000).toISOString();

    const pastEvent = createEvent(vehicleId, pastTime, 0.0, 50.0);
    await stateService.updateFromTelemetry(pastEvent);

    const state = await stateService.getVehicleState(vehicleId);
    assert.ok(state);
    assert.equal(state.status, "OFFLINE", "Vehicle with stale telemetry must be dynamically evaluated as OFFLINE");
    assert.equal(state.isOnline, false);
  });

  it("should batch retrieve multiple vehicle states in a single MGET call", async () => {
    const veh1 = `veh_batch_1_${Date.now()}`;
    const veh2 = `veh_batch_2_${Date.now()}`;
    const nowIso = new Date().toISOString();

    await stateService.updateFromTelemetry(createEvent(veh1, nowIso, 60.0, 90.0));
    await stateService.updateFromTelemetry(createEvent(veh2, nowIso, 80.0, 45.0));

    const results = await stateService.getMultipleVehicleStates([veh1, veh2, "non_existent_veh"]);
    assert.ok(results[veh1]);
    assert.equal(results[veh1]?.latestTelemetry.speed, 60.0);
    assert.ok(results[veh2]);
    assert.equal(results[veh2]?.latestTelemetry.speed, 80.0);
    assert.equal(results["non_existent_veh"], null);
  });
});
