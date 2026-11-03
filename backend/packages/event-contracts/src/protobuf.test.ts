import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeTelemetryV1,
  decodeTelemetryV1,
  encodeTelemetryV2,
  decodeTelemetryV2,
} from "./protobuf.js";
import { LocalSchemaRegistry } from "./schemaRegistry.js";

test("Phase 30 — Event Versioning, Protobuf, and Schema Registry Suite", async (t) => {
  const sampleV1Payload = {
    eventId: "evt-v1-12345",
    vehicleId: "veh-test-v1",
    deviceId: "dev-hw-001",
    timestamp: "2026-11-03T10:00:00.000Z",
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      heading: 180,
      altitudeMeters: 15,
    },
    speedKmh: 65.5,
    fuelLevelPct: 82.0,
    batteryLevelPct: 95.0,
    engineTempC: 88.5,
    odometerKm: 12500.2,
  };

  await t.test("successfully serializes and deserializes Protobuf V1 telemetry payload", () => {
    const encoded = encodeTelemetryV1(sampleV1Payload);
    assert.ok(encoded instanceof Uint8Array, "Encoded buffer should be Uint8Array");
    assert.ok(encoded.length > 0, "Buffer should not be empty");

    const decoded = decodeTelemetryV1(encoded);
    assert.equal(decoded.eventId, sampleV1Payload.eventId);
    assert.equal(decoded.vehicleId, sampleV1Payload.vehicleId);
    assert.equal(decoded.speedKmh, sampleV1Payload.speedKmh);
    assert.equal(decoded.location.latitude, sampleV1Payload.location.latitude);
    assert.equal(decoded.location.longitude, sampleV1Payload.location.longitude);
  });

  await t.test("demonstrates forward compatibility: V1 consumer decodes V2 payload without error", () => {
    const sampleV2Payload = {
      ...sampleV1Payload,
      tirePressurePsi: 32.5,
      ambientTempC: 22.0,
    };

    // Producer encodes with V2 schema
    const encodedV2 = encodeTelemetryV2(sampleV2Payload);

    // Legacy V1 consumer decodes buffer (ignores unrecognized tags 11 & 12 safely)
    const decodedByV1 = decodeTelemetryV1(encodedV2);

    assert.equal(decodedByV1.eventId, sampleV2Payload.eventId);
    assert.equal(decodedByV1.speedKmh, sampleV2Payload.speedKmh);
    assert.equal((decodedByV1 as any).tirePressurePsi, undefined, "V1 consumer does not crash on new fields");
  });

  await t.test("demonstrates backward compatibility: V2 consumer decodes legacy V1 payload with defaults", () => {
    // Producer encodes with legacy V1 schema
    const encodedV1 = encodeTelemetryV1(sampleV1Payload);

    // Modern V2 consumer decodes buffer
    const decodedByV2 = decodeTelemetryV2(encodedV1);

    assert.equal(decodedByV2.eventId, sampleV1Payload.eventId);
    assert.equal(decodedByV2.speedKmh, sampleV1Payload.speedKmh);
    assert.equal(decodedByV2.tirePressurePsi, 0, "Missing V2 fields receive safe proto3 defaults");
  });

  await t.test("enforces schema evolution rules in LocalSchemaRegistry", () => {
    const registry = new LocalSchemaRegistry("BACKWARD");

    const schemaV1 = `
      message RawTelemetry {
        string event_id = 1;
        string vehicle_id = 2;
        double speed_kmh = 6;
      }
    `;

    const schemaV2Compatible = `
      message RawTelemetry {
        string event_id = 1;
        string vehicle_id = 2;
        double speed_kmh = 6;
        double tire_pressure_psi = 11;
      }
    `;

    const schemaIncompatible = `
      message RawTelemetry {
        string event_id = 1;
        string vehicle_id = 2;
        string speed_kmh = 6; // ERROR: altered tag 6 type from double to string!
      }
    `;

    // 1. Register V1
    const registeredV1 = registry.register("vehicle.telemetry", schemaV1);
    assert.equal(registeredV1.version, 1);

    // 2. Register compatible evolution (V2)
    const registeredV2 = registry.register("vehicle.telemetry", schemaV2Compatible);
    assert.equal(registeredV2.version, 2);

    // 3. Register incompatible breaking change -> must reject
    assert.throws(
      () => {
        registry.register("vehicle.telemetry", schemaIncompatible);
      },
      /Incompatible schema evolution/,
      "Registry must reject incompatible schema breaking change"
    );
  });
});
