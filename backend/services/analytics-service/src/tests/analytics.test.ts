import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createLogger } from "@vehicle-pulse/logger";
import { createKafkaClient } from "@vehicle-pulse/shared";
import { KAFKA_TOPICS, type TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import { createApp } from "../app.js";
import { getPrismaClient, connectPostgres, disconnectPostgres } from "../app/db/prisma.js";
import { AnalyticsKafkaConsumer } from "../app/kafka/analyticsConsumer.js";

const testLogger = createLogger({ serviceName: "test-analytics-service", level: "silent" });
const brokers = ["localhost:9092"];
const testGroupId = `test-analytics-group-${Date.now()}`;

describe("Phase 14 — Analytics Service Foundation & Worker Integration", () => {
  const prisma = getPrismaClient();

  before(async () => {
    // 1. Verify PostgreSQL connection
    await connectPostgres(testLogger);

    // 2. Start Analytics Kafka consumer
    await AnalyticsKafkaConsumer.startConsumer({
      brokers,
      groupId: testGroupId,
      logger: testLogger,
    });
  });

  after(async () => {
    await AnalyticsKafkaConsumer.stopConsumer(testLogger);
    await disconnectPostgres(testLogger);
  });

  it("should initialize Express application and provide health route with live PostgreSQL check", async () => {
    const app = createApp({ logger: testLogger });
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
      assert.equal(response.status, 200);

      const json = (await response.json()) as {
        status: string;
        checks: {
          postgresql: { status: string };
          "kafka-consumer": { status: string };
        };
      };
      assert.equal(json.status, "READY");
      assert.equal(json.checks.postgresql.status, "UP");
      assert.equal(json.checks["kafka-consumer"].status, "UP");

      const analyticsHealth = await fetch(`http://127.0.0.1:${port}/api/analytics/v1/health`);
      assert.equal(analyticsHealth.status, 200);
      const analyticsJson = (await analyticsHealth.json()) as {
        success: boolean;
        data: { database: string };
      };
      assert.equal(analyticsJson.success, true);
      assert.equal(analyticsJson.data.database, "PostgreSQL");
    } finally {
      server.close();
    }
  });

  it("should consume a telemetry event from Kafka and record idempotency in PostgreSQL", async () => {
    const kafka = createKafkaClient({
      clientId: "test-analytics-producer",
      brokers,
    });
    const producer = kafka.producer();
    await producer.connect();

    const uniqueId = randomUUID();
    const vehicleId = "veh_analytics_test_01";

    const testEvent: TelemetryRawEvent = {
      eventId: uniqueId,
      eventType: "telemetry.raw",
      version: "1.0.0",
      vehicleId,
      deviceId: "dev_analytics_01",
      timestamp: new Date().toISOString(),
      data: {
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          heading: 180,
          altitude: 15,
        },
        speed: 65.5,
        rpm: 2500,
        fuelLevelPercent: 82.5,
        engineTemperatureCelsius: 90,
        batteryVoltage: 13.8,
        odometerKm: 14500,
        engineStatus: "ON",
        accelerationG: 0.05,
      },
    };

    // Publish to vehicle.telemetry.raw
    await producer.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: [
        {
          key: vehicleId,
          value: JSON.stringify(testEvent),
        },
      ],
    });
    await producer.disconnect();

    // Poll PostgreSQL for the processed event (giving Kafka worker time to consume)
    let found = false;
    for (let i = 0; i < 30; i++) {
      const record = await prisma.processedEvent.findUnique({
        where: { eventId: uniqueId },
      });
      if (record) {
        assert.equal(record.vehicleId, vehicleId);
        assert.equal(record.eventType, "telemetry.raw");
        found = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    assert.equal(found, true, "ProcessedEvent must be inserted into PostgreSQL by the Analytics Kafka consumer");
  });
});

