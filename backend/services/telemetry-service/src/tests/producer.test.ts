import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createLogger } from "@vehicle-pulse/logger";
import { createKafkaClient } from "@vehicle-pulse/shared";
import { KAFKA_TOPICS, type TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import { TelemetryKafkaProducer } from "../app/kafka/telemetryProducer.js";

const testLogger = createLogger({ serviceName: "test-kafka-producer", level: "silent" });
const brokers = ["localhost:9092"];

describe("Phase 11 — Telemetry Kafka Producer Validation & Error Suite", () => {
  before(async () => {
    await TelemetryKafkaProducer.initProducer({
      brokers,
      clientId: "telemetry-producer-test-suite",
      logger: testLogger,
    });
  });

  after(async () => {
    await TelemetryKafkaProducer.disconnectProducer(testLogger);
  });

  it("should report producer status as connected", () => {
    const status = TelemetryKafkaProducer.getProducerStatus();
    assert.equal(status.isConnected, true);
  });

  it("should reject an invalid telemetry payload without publishing to Kafka", async () => {
    const invalidEvent = {
      eventId: "not-a-uuid", // Invalid UUID
      eventType: "invalid.type",
      version: "1.0.0",
      vehicleId: "veh_fail_01",
      deviceId: "dev_fail_01",
      timestamp: "not-a-date",
      data: {
        location: {
          latitude: 999, // Invalid latitude (> 90)
          longitude: -200, // Invalid longitude (< -180)
        },
        speed: -50, // Invalid negative speed
      },
    };

    const result = await TelemetryKafkaProducer.publishTelemetryEvent(invalidEvent, testLogger);
    assert.equal(result.published, false);
    assert.ok(result.error);
    assert.match(result.error, /Invalid telemetry event contract/);
  });

  it("should publish a valid event with exact partition keying and receive via Kafka Consumer", async () => {
    const kafka = createKafkaClient({
      clientId: "test-phase11-consumer",
      brokers,
    });
    const consumer = kafka.consumer({
      groupId: `test-phase11-group-${Date.now()}`,
    });

    const testVehicleId = "veh_phase11_verified";
    const validEvent: TelemetryRawEvent = {
      eventId: "e10a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      eventType: "telemetry.raw",
      version: "1.0.0",
      vehicleId: testVehicleId,
      deviceId: "dev_phase11_01",
      timestamp: new Date().toISOString(),
      data: {
        location: {
          latitude: 40.7128,
          longitude: -74.006,
          heading: 270,
          altitude: 10,
        },
        speed: 80.5,
        rpm: 2600,
        fuelLevelPercent: 75.0,
        engineTemperatureCelsius: 88,
        batteryVoltage: 14.1,
        odometerKm: 32000,
        engineStatus: "ON",
        accelerationG: 0.08,
      },
    };

    let receivedMessage: any = null;

    try {
      await consumer.connect();
      await consumer.subscribe({
        topic: KAFKA_TOPICS.TELEMETRY_RAW,
        fromBeginning: true,
      });

      const receivePromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timed out waiting for published event on consumer"));
        }, 15000);

        consumer.run({
          eachMessage: async ({ message, partition }) => {
            if (message.key?.toString() === testVehicleId) {
              receivedMessage = {
                key: message.key.toString(),
                partition,
                value: JSON.parse(message.value?.toString() || "{}"),
                headers: Object.fromEntries(
                  Object.entries(message.headers || {}).map(([k, v]) => [k, v?.toString()])
                ),
              };
              clearTimeout(timeout);
              resolve();
            }
          },
        });
      });

      const publishResult = await TelemetryKafkaProducer.publishTelemetryEvent(validEvent, testLogger);
      assert.equal(publishResult.published, true);
      assert.equal(publishResult.topic, KAFKA_TOPICS.TELEMETRY_RAW);

      await receivePromise;

      assert.notEqual(receivedMessage, null);
      assert.equal(receivedMessage.key, testVehicleId);
      assert.equal(receivedMessage.value.eventId, validEvent.eventId);
      assert.equal(receivedMessage.value.data.speed, 80.5);
      assert.equal(receivedMessage.headers["x-event-type"], "telemetry.raw");
      assert.equal(receivedMessage.headers["x-source"], "telemetry-service");
    } finally {
      await consumer.stop().catch(() => {});
      await consumer.disconnect().catch(() => {});
    }
  });

  it("should publish a batch containing valid events while reporting errors for invalid ones", async () => {
    const batch = [
      {
        eventId: "f10a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5d",
        eventType: "telemetry.raw",
        version: "1.0.0",
        vehicleId: "veh_batch_valid_01",
        deviceId: "dev_batch_01",
        timestamp: new Date().toISOString(),
        data: {
          location: { latitude: 34.0522, longitude: -118.2437, heading: 90 },
          speed: 45,
          rpm: 1800,
          fuelLevelPercent: 90,
          engineTemperatureCelsius: 82,
          batteryVoltage: 13.9,
          odometerKm: 12000,
          engineStatus: "ON",
        },
      },
      {
        // Malformed event
        eventId: "invalid-event-id",
        eventType: "telemetry.raw",
      },
    ];

    const result = await TelemetryKafkaProducer.publishTelemetryBatch(batch, testLogger);
    assert.equal(result.publishedCount, 1);
    assert.equal(result.errors.length, 1);
  });
});
