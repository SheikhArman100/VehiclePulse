import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoChangeStreamManager } from "../app/db/changeStream.js";
import { Vehicle } from "../app/modules/vehicle/vehicle.model.js";
import { createLogger } from "@vehicle-pulse/logger";

const logger = createLogger({ serviceName: "change-stream-test" });
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/vehiclepulse_telemetry";

test("Phase 29 — MongoDB Change Streams Suite", async (t) => {
  let isConnected = false;
  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
  } catch (err) {
    logger.warn({ err }, "Could not connect to MongoDB for test; skipping live integration");
  }

  await t.test("verifies ChangeStreamManager interface and methods", () => {
    assert.equal(typeof MongoChangeStreamManager.startWatching, "function");
    assert.equal(typeof MongoChangeStreamManager.stopWatching, "function");
    assert.equal(typeof MongoChangeStreamManager.getResumeToken, "function");
  });

  if (isConnected) {
    await t.test("captures vehicle change events and records resume token", async () => {
      let changeObserved = false;
      let recordedOp: string | null = null;

      await MongoChangeStreamManager.startWatching({
        logger,
        onVehicleChange: (change: any) => {
          changeObserved = true;
          recordedOp = change.operationType;
        },
      });

      // Insert a test vehicle to trigger the change stream
      const testId = `test_change_${Date.now()}`;
      await Vehicle.create({
        vehicleId: testId,
        vin: `VIN${Date.now()}TEST`.slice(0, 17),
        make: "Toyota",
        model: "Camry",
        year: 2024,
        licensePlate: "STREAM1",
        status: "active",
      });

      // Wait for change stream event delivery with polling
      for (let i = 0; i < 20; i++) {
        if (changeObserved) break;
        await new Promise((r) => setTimeout(r, 200));
      }

      assert.ok(changeObserved, "Expected change stream event to be received");
      assert.equal(recordedOp, "insert");

      // Verify resume token was stored
      const token = MongoChangeStreamManager.getResumeToken();
      assert.ok(token !== null, "Resume token should be tracked");

      // Cleanup
      await MongoChangeStreamManager.stopWatching();
      await Vehicle.deleteOne({ vehicleId: testId });
    });

    t.after(async () => {
      await MongoChangeStreamManager.stopWatching();
      await mongoose.disconnect();
    });
  }
});
