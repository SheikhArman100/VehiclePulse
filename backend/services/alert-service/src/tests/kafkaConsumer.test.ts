import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createKafkaClient, type Producer } from "@vehicle-pulse/shared";
import { KAFKA_TOPICS, type TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import { createLogger } from "@vehicle-pulse/logger";
import { connectMySQL, disconnectMySQL, getPrismaClient } from "../app/db/prisma.js";
import { startAlertConsumer, stopAlertConsumer, getAlertConsumerMetrics } from "../app/kafka/alertConsumer.js";
import { env } from "../config/env.js";

const testLogger = createLogger({ serviceName: "test-alert-kafka", level: "silent" });

describe("Phase 19 — Alert Kafka Consumer Reliability & Poison-Pill Suite", () => {
  const prisma = getPrismaClient();
  let producer: Producer;
  const testGroupId = `test-alert-group-${Date.now()}`;
  const brokers = env.KAFKA_BROKERS.split(",").map((b) => b.trim());

  before(async () => {
    await connectMySQL(testLogger);

    const kafka = createKafkaClient({
      clientId: "test-alert-producer",
      brokers,
    });
    producer = kafka.producer();
    await producer.connect();

    // Start Alert Consumer on dedicated test group from beginning
    await startAlertConsumer({
      brokers,
      groupId: testGroupId,
      logger: testLogger,
      fromBeginning: true,
    });

    // Allow consumer group rebalance and connection settle
    await new Promise((r) => setTimeout(r, 3000));
  });

  after(async () => {
    await stopAlertConsumer(testLogger);
    await producer.disconnect();
    await disconnectMySQL(testLogger);
  });

  it("should consume real-time speeding telemetry, persist MySQL Alert & Event, and update consumer metrics", async () => {
    const testVehicleId = `veh_kafka_speed_${Date.now()}`;
    const testTelemetry: TelemetryRawEvent = {
      eventId: randomUUID(),
      eventType: "telemetry.raw",
      timestamp: new Date().toISOString(),
      vehicleId: testVehicleId,
      deviceId: "obd_kafka_test",
      version: "1.0.0",
      data: {
        location: { latitude: 37.7749, longitude: -122.4194, heading: 180 },
        speed: 138.5, // Violates 120 km/h SPEED_LIMIT rule
        rpm: 3800,
        fuelLevelPercent: 62.0,
        engineTemperatureCelsius: 92.0,
        batteryVoltage: 13.8,
        odometerKm: 24500,
        engineStatus: "ON",
        accelerationG: 0.12,
      },
    };

    // Publish to vehicle.telemetry.raw
    await producer.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: [
        {
          key: testVehicleId,
          value: JSON.stringify(testTelemetry),
        },
      ],
    });

    // Wait and poll for consumer to process message and persist to MySQL
    let alertFound = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      alertFound = await prisma.alert.findFirst({
        where: { vehicleId: testVehicleId },
        include: { events: true },
      });
      if (alertFound) break;
    }

    assert.ok(alertFound, "Alert record must be created asynchronously by Kafka consumer");
    assert.equal(alertFound.status, "OPEN");
    assert.equal(alertFound.triggerValue, 138.5);
    assert.ok(alertFound.events.length >= 1, "Must contain initial alert event record");

    const metrics = getAlertConsumerMetrics();
    assert.ok(metrics.messagesProcessed >= 1, "Consumer metrics messagesProcessed must increment");
    assert.ok(metrics.alertsCreatedOrAppended >= 1, "Consumer metrics alertsCreatedOrAppended must increment");
  });

  it("should survive poison messages (malformed JSON and schema mismatches) without crashing or halting stream", async () => {
    const initialSkippedCount = getAlertConsumerMetrics().poisonMessagesSkipped;
    const testVehicleId = `veh_kafka_poison_after_${Date.now()}`;

    // 1. Send completely invalid, non-JSON bytes
    await producer.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: [
        {
          key: "poison_1",
          value: "<<<BAD-MALFORMED-NON-JSON-PAYLOAD>>>",
        },
      ],
    });

    // 2. Send JSON payload violating TelemetryRawEvent contract
    await producer.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: [
        {
          key: "poison_2",
          value: JSON.stringify({ invalid: true, brokenPayload: 12345 }),
        },
      ],
    });

    // 3. Send valid telemetry violation right after poison pills to verify stream didn't stall
    const validTelemetry: TelemetryRawEvent = {
      eventId: randomUUID(),
      eventType: "telemetry.raw",
      timestamp: new Date().toISOString(),
      vehicleId: testVehicleId,
      deviceId: "obd_recovery_test",
      version: "1.0.0",
      data: {
        location: { latitude: 34.0522, longitude: -118.2437, heading: 45 },
        speed: 142.0, // Speeding violation
        rpm: 3900,
        fuelLevelPercent: 55.0,
        engineTemperatureCelsius: 95.0,
        batteryVoltage: 13.6,
        odometerKm: 32000,
        engineStatus: "ON",
        accelerationG: 0.15,
      },
    };

    await producer.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: [
        {
          key: testVehicleId,
          value: JSON.stringify(validTelemetry),
        },
      ],
    });

    // Poll until valid telemetry after poison messages is processed
    let alertFound = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      alertFound = await prisma.alert.findFirst({
        where: { vehicleId: testVehicleId },
      });
      if (alertFound) break;
    }

    assert.ok(alertFound, "Consumer must process subsequent valid events after encountering poison messages");
    assert.equal(alertFound.triggerValue, 142.0);

    const metricsAfter = getAlertConsumerMetrics();
    assert.ok(
      metricsAfter.poisonMessagesSkipped >= initialSkippedCount + 2,
      "Consumer must track skipped poison messages in metrics"
    );
  });
});
