import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { StatefulVehicleModel } from "../vehicleModel.js";
import { TelemetryRawEventSchema } from "@vehicle-pulse/event-contracts";

describe("Phase 9 — Stateful Vehicle Telemetry Simulator", () => {
  it("should generate valid TelemetryRawEvent adhering to canonical event contract", () => {
    const vehicle = new StatefulVehicleModel("veh_sim_01", "dev_sim_01", "1HGCR2F83HA100001", 12345);
    const event = vehicle.tick(1);

    // Validate using Zod schema from @vehicle-pulse/event-contracts
    const parsed = TelemetryRawEventSchema.safeParse(event);
    assert.equal(parsed.success, true);
    assert.equal(event.vehicleId, "veh_sim_01");
    assert.equal(event.eventType, "telemetry.raw");
    assert.equal(event.version, "1.0.0");
  });

  it("should produce reproducible telemetry when using identical seed", () => {
    const v1 = new StatefulVehicleModel("veh_01", "dev_01", "VIN1", 42);
    const v2 = new StatefulVehicleModel("veh_01", "dev_01", "VIN1", 42);

    const events1 = [v1.tick(1), v1.tick(1), v1.tick(1)];
    const events2 = [v2.tick(1), v2.tick(1), v2.tick(1)];

    for (let i = 0; i < 3; i++) {
      assert.equal(events1[i].data.speed, events2[i].data.speed);
      assert.equal(events1[i].data.rpm, events2[i].data.rpm);
      assert.equal(events1[i].data.location.latitude, events2[i].data.location.latitude);
      assert.equal(events1[i].data.location.longitude, events2[i].data.location.longitude);
      assert.equal(events1[i].data.fuelLevelPercent, events2[i].data.fuelLevelPercent);
    }
  });

  it("should simulate realistic state transitions (accelerating, cruising, braking, idling)", () => {
    const vehicle = new StatefulVehicleModel("veh_01", "dev_01", "VIN1", 9999);

    const states = new Set<string>();
    for (let i = 0; i < 50; i++) {
      vehicle.tick(1);
      states.add(vehicle.getState().drivingState);
    }

    // Must exhibit multiple realistic driving states
    assert.equal(states.size >= 2, true);
  });

  it("should keep all telemetry parameters within physical vehicle constraints", () => {
    const vehicle = new StatefulVehicleModel("veh_01", "dev_01", "VIN1", 54321);

    for (let i = 0; i < 100; i++) {
      const event = vehicle.tick(1);
      assert.equal(event.data.speed >= 0 && event.data.speed <= 250, true);
      assert.equal(event.data.rpm >= 0 && event.data.rpm <= 10000, true);
      assert.equal(event.data.fuelLevelPercent >= 0 && event.data.fuelLevelPercent <= 100, true);
      assert.equal(event.data.engineTemperatureCelsius >= 20 && event.data.engineTemperatureCelsius <= 130, true);
      assert.equal(event.data.batteryVoltage >= 11 && event.data.batteryVoltage <= 15, true);
      assert.equal(event.data.location.latitude >= -90 && event.data.location.latitude <= 90, true);
      assert.equal(event.data.location.longitude >= -180 && event.data.location.longitude <= 180, true);
    }
  });
});
