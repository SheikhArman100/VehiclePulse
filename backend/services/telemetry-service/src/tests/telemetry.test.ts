import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createLogger } from "@vehicle-pulse/logger";
import { TelemetryService } from "../app/modules/telemetry/telemetry.service.js";
import { Telemetry } from "../app/modules/telemetry/telemetry.model.js";
import { TelemetryKafkaProducer } from "../app/kafka/telemetryProducer.js";

const MONGO_TEST_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/vehiclepulse_test";
const testLogger = createLogger({ serviceName: "test-telemetry", level: "silent" });

describe("Phase 8 & 11 — Telemetry Storage & Kafka Producer", () => {
  before(async () => {
    await mongoose.connect(MONGO_TEST_URI);
    try {
      await mongoose.connection.db?.dropCollection("telemetries");
    } catch {
      // Ignore if collection did not exist
    }
    // Create collection with time-series options and build indexes
    await Telemetry.createCollection();
    await Telemetry.createIndexes();

    // Initialize Kafka producer
    await TelemetryKafkaProducer.initProducer({
      brokers: ["localhost:9092"],
      clientId: "telemetry-test-producer",
      logger: testLogger,
    });
  });

  after(async () => {
    try {
      await mongoose.connection.db?.dropCollection("telemetries");
    } catch {
      // Ignore
    }
    await TelemetryKafkaProducer.disconnectProducer(testLogger);
    await mongoose.disconnect();
  });

  it("should record a single telemetry data point in time-series and publish to Kafka", async () => {
    const now = new Date();
    const recorded = await TelemetryService.recordTelemetry({
      timestamp: now,
      metadata: {
        vehicleId: "veh_ts_01",
        deviceId: "dev_ts_01",
        vin: "1HGCR2F83HA777777",
      },
      location: {
        type: "Point",
        coordinates: [-122.4194, 37.7749], // San Francisco, CA [lng, lat]
      },
      heading: 180,
      altitude: 15,
      speed: 65.5,
      rpm: 2400,
      fuelLevelPercent: 88,
      engineTemperatureCelsius: 91,
      batteryVoltage: 13.8,
      odometerKm: 14500.5,
      engineStatus: "ON",
      accelerationG: 0.1,
    }, testLogger);

    assert.equal(recorded.storageRecord.metadata.vehicleId, "veh_ts_01");
    assert.equal(recorded.storageRecord.speed, 65.5);
    assert.equal(recorded.storageRecord.location.coordinates[0], -122.4194);
    assert.equal(recorded.storageRecord.location.coordinates[1], 37.7749);
    assert.equal(recorded.kafkaPublish.published, true);
    assert.equal(recorded.kafkaPublish.topic, "vehicle.telemetry.raw");
  });

  it("should ingest a batch of telemetry records", async () => {
    const baseTime = Date.now();
    const batch = [
      {
        timestamp: new Date(baseTime - 3000),
        metadata: { vehicleId: "veh_ts_01", deviceId: "dev_ts_01" },
        location: { type: "Point" as const, coordinates: [-122.4195, 37.775] as [number, number] },
        heading: 182,
        speed: 68.0,
        rpm: 2500,
        fuelLevelPercent: 87.9,
        engineTemperatureCelsius: 92,
        batteryVoltage: 13.8,
        odometerKm: 14500.6,
        engineStatus: "ON" as const,
      },
      {
        timestamp: new Date(baseTime - 1000),
        metadata: { vehicleId: "veh_ts_01", deviceId: "dev_ts_01" },
        location: { type: "Point" as const, coordinates: [-122.4196, 37.7751] as [number, number] },
        heading: 185,
        speed: 72.0,
        rpm: 2700,
        fuelLevelPercent: 87.8,
        engineTemperatureCelsius: 92.5,
        batteryVoltage: 13.9,
        odometerKm: 14500.7,
        engineStatus: "ON" as const,
      },
    ];

    const batchResult = await TelemetryService.recordTelemetryBatch(batch, testLogger);
    assert.equal(batchResult.storedCount, 2);
    assert.equal(batchResult.kafkaPublishedCount, 2);
  });

  it("should query vehicle history with pagination and time range", async () => {
    const history = await TelemetryService.getVehicleHistory({
      vehicleId: "veh_ts_01",
      page: 1,
      limit: 10,
    });

    assert.equal(history.meta.total >= 3, true);
    assert.equal(history.data.length >= 3, true);
    assert.equal(history.data[0].metadata.vehicleId, "veh_ts_01");
  });

  it("should retrieve the latest telemetry data point for a vehicle", async () => {
    const latest = await TelemetryService.getLatestVehicleTelemetry("veh_ts_01");
    assert.notEqual(latest, null);
    assert.equal(latest!.metadata.vehicleId, "veh_ts_01");
  });

  it("should perform a 2dsphere geospatial $near proximity query", async () => {
    // Coordinate near downtown San Francisco
    const nearby = await TelemetryService.findNearbyTelemetry({
      longitude: -122.4194,
      latitude: 37.7749,
      maxDistanceMeters: 5000, // 5km radius
      limit: 5,
    });

    assert.equal(nearby.length >= 1, true);
    assert.equal(nearby[0].metadata.vehicleId, "veh_ts_01");
  });

  it("should execute an aggregation pipeline computing hourly metrics", async () => {
    const stats = await TelemetryService.getVehicleHourlyStats("veh_ts_01");
    assert.equal(Array.isArray(stats), true);
    assert.equal(stats.length >= 1, true);
    assert.equal(stats[0].dataPointsCount >= 3, true);
    assert.equal(typeof stats[0].avgSpeed, "number");
    assert.equal(typeof stats[0].maxSpeed, "number");
    assert.equal(typeof stats[0].maxRpm, "number");
  });
});
