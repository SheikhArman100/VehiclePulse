import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { VehicleService } from "../app/modules/vehicle/vehicle.service.js";
import { DeviceService } from "../app/modules/device/device.service.js";
import { Vehicle } from "../app/modules/vehicle/vehicle.model.js";
import { Device } from "../app/modules/device/device.model.js";

const MONGO_TEST_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/vehiclepulse_test";

describe("Phase 7 - MongoDB Integration & Vehicle/Device Management", () => {
  before(async () => {
    await mongoose.connect(MONGO_TEST_URI);
    await Vehicle.deleteMany({});
    await Device.deleteMany({});
  });

  after(async () => {
    await Vehicle.deleteMany({});
    await Device.deleteMany({});
    await mongoose.disconnect();
  });

  it("should create a vehicle successfully", async () => {
    const vehicle = await VehicleService.createVehicle({
      vehicleId: "veh_test_01",
      vin: "1HGCR2F83HA009999",
      make: "Toyota",
      model: "RAV4 Prime",
      year: 2024,
      licensePlate: "TEST-001",
      status: "active",
      fuelType: "hybrid",
    });

    assert.equal(vehicle.vehicleId, "veh_test_01");
    assert.equal(vehicle.make, "Toyota");
    assert.equal(vehicle.fuelType, "hybrid");
  });

  it("should reject duplicate vehicleId with duplicate key error", async () => {
    await assert.rejects(
      async () => {
        await VehicleService.createVehicle({
          vehicleId: "veh_test_01",
          vin: "1HGCR2F83HA008888",
          make: "Toyota",
          model: "RAV4",
          year: 2024,
          licensePlate: "TEST-002",
          status: "active",
        });
      },
      (err: any) => {
        return err.name === "MongoServerError" && err.code === 11000;
      }
    );
  });

  it("should list vehicles with search and pagination", async () => {
    const result = await VehicleService.getAllVehicles(
      { searchTerm: "Toyota" },
      { page: 1, limit: 10 }
    );

    assert.equal(result.meta.total, 1);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].vehicleId, "veh_test_01");
  });

  it("should get a single vehicle by vehicleId", async () => {
    const vehicle = await VehicleService.getSingleVehicle("veh_test_01");
    assert.equal(vehicle.vehicleId, "veh_test_01");
    assert.equal(vehicle.model, "RAV4 Prime");
  });

  it("should update a vehicle partially", async () => {
    const updated = await VehicleService.updateVehicle("veh_test_01", {
      status: "maintenance",
    });

    assert.equal(updated.status, "maintenance");
  });

  it("should delete a vehicle", async () => {
    const deleted = await VehicleService.deleteVehicle("veh_test_01");
    assert.equal(deleted.vehicleId, "veh_test_01");

    await assert.rejects(
      async () => {
        await VehicleService.getSingleVehicle("veh_test_01");
      },
      {
        name: "NotFoundError",
        statusCode: 404,
      }
    );
  });

  it("should create and manage devices", async () => {
    const device = await DeviceService.createDevice({
      deviceId: "dev_obd_01",
      serialNumber: "SN-998877",
      firmwareVersion: "v1.2.0",
      status: "unpaired",
    });

    assert.equal(device.deviceId, "dev_obd_01");

    const updated = await DeviceService.updateDevice("dev_obd_01", {
      status: "online",
      vehicleId: "veh_assigned_01",
    });

    assert.equal(updated.status, "online");
    assert.equal(updated.vehicleId, "veh_assigned_01");
  });
});
