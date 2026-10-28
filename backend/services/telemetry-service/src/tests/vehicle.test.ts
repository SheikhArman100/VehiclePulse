import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VehicleService } from "../app/modules/vehicle/vehicle.service.js";

describe("Telemetry Service - Vehicle Module (Starter-aligned)", () => {
  it("should list all available vehicles via VehicleService.getAllVehicles", async () => {
    const vehicles = await VehicleService.getAllVehicles();
    assert.equal(Array.isArray(vehicles), true);
    assert.equal(vehicles.length >= 2, true);
    assert.equal(vehicles[0].id, "veh_1001");
  });

  it("should find an existing vehicle via VehicleService.getSingleVehicle", async () => {
    const vehicle = await VehicleService.getSingleVehicle("veh_1001");
    assert.equal(vehicle.id, "veh_1001");
    assert.equal(vehicle.make, "Tesla");
    assert.equal(vehicle.model, "Model 3");
  });

  it("should throw NotFoundError for non-existent vehicle ID", async () => {
    await assert.rejects(
      async () => {
        await VehicleService.getSingleVehicle("veh_non_existent");
      },
      (err: unknown) => {
        const error = err as { name: string; statusCode: number };
        return error.name === "NotFoundError" && error.statusCode === 404;
      }
    );
  });
});
