import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createLogger } from "@vehicle-pulse/logger";
import { createKafkaClient } from "@vehicle-pulse/shared";
import { KAFKA_TOPICS, type TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import { createApp } from "../app.js";
import { getPrismaClient, connectPostgres, disconnectPostgres } from "../app/db/prisma.js";
import { AnalyticsKafkaConsumer } from "../app/kafka/analyticsConsumer.js";

const testLogger = createLogger({ serviceName: "test-analytics-p15", level: "silent" });
const brokers = ["localhost:9092"];
const testGroupId = `test-analytics-p15-group-${Date.now()}`;

describe("Phase 15 — Analytics Schema & Aggregation Consumer Suite", () => {
  const prisma = getPrismaClient();

  before(async () => {
    await connectPostgres(testLogger);
    await AnalyticsKafkaConsumer.startConsumer({
      brokers,
      groupId: testGroupId,
      logger: testLogger,
      fromBeginning: true,
    });
  });


  after(async () => {
    await AnalyticsKafkaConsumer.stopConsumer(testLogger);
    await disconnectPostgres(testLogger);
  });

  it("should process telemetry event into hourly/daily rollups and trips without double-counting on duplicates", async () => {
    const kafka = createKafkaClient({
      clientId: "test-p15-producer",
      brokers,
    });
    const producer = kafka.producer();
    await producer.connect();

    const uniqueEventId = randomUUID();
    const vehicleId = `veh_p15_${Date.now()}`;
    const timestamp = new Date("2026-10-29T10:15:00.000Z").toISOString();

    const testEvent: TelemetryRawEvent = {
      eventId: uniqueEventId,
      eventType: "telemetry.raw",
      version: "1.0.0",
      vehicleId,
      deviceId: "dev_p15_01",
      timestamp,
      data: {
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          heading: 90,
          altitude: 10,
        },
        speed: 70.0,
        rpm: 2800,
        fuelLevelPercent: 70.0,
        engineTemperatureCelsius: 92,
        batteryVoltage: 13.9,
        odometerKm: 50100,
        engineStatus: "ON",
        accelerationG: 0.1,
      },
    };

    // 1. Send first event
    await producer.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: [{ key: vehicleId, value: JSON.stringify(testEvent) }],
    });

    // 2. Send DUPLICATE event with same eventId to verify replay-safety
    await producer.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: [{ key: vehicleId, value: JSON.stringify(testEvent) }],
    });

    await producer.disconnect();

    // 3. Poll PostgreSQL for durable aggregation verification
    let hourlyRecord = null;
    let dailyRecord = null;
    let tripRecord = null;

    for (let i = 0; i < 30; i++) {
      const processed = await prisma.processedEvent.findUnique({
        where: { eventId: uniqueEventId },
      });

      if (processed) {
        hourlyRecord = await prisma.hourlyVehicleStat.findFirst({
          where: { vehicleId },
        });
        dailyRecord = await prisma.dailyVehicleStat.findFirst({
          where: { vehicleId },
        });
        tripRecord = await prisma.vehicleTrip.findFirst({
          where: { vehicleId, status: "ACTIVE" },
        });

        if (hourlyRecord && dailyRecord && tripRecord) {
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    assert.ok(hourlyRecord, "HourlyVehicleStat should be created");
    assert.equal(hourlyRecord.eventCount, 1, "Duplicate event must not be counted twice in HourlyVehicleStat");
    assert.equal(hourlyRecord.avgSpeedKmh, 70.0);
    assert.equal(hourlyRecord.maxSpeedKmh, 70.0);

    assert.ok(dailyRecord, "DailyVehicleStat should be created");
    assert.equal(dailyRecord.eventCount, 1, "Duplicate event must not be counted twice in DailyVehicleStat");

    assert.ok(tripRecord, "Active VehicleTrip should be started");
    assert.equal(tripRecord.status, "ACTIVE");
    assert.equal(tripRecord.maxSpeedKmh, 70.0);

    // 4. Test HTTP Analytics APIs
    const app = createApp({ logger: testLogger });
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      // Test Fleet Summary
      const summaryRes = await fetch(`http://127.0.0.1:${port}/api/analytics/v1/summary`);
      assert.equal(summaryRes.status, 200);
      const summaryJson = (await summaryRes.json()) as any;
      assert.equal(summaryJson.success, true);
      assert.ok(summaryJson.data.totalProcessedEvents >= 1);
      assert.ok(summaryJson.data.trackedVehiclesCount >= 1);

      // Test Hourly endpoint
      const hourlyRes = await fetch(`http://127.0.0.1:${port}/api/analytics/v1/vehicles/${vehicleId}/hourly`);
      assert.equal(hourlyRes.status, 200);
      const hourlyJson = (await hourlyRes.json()) as any;
      assert.equal(hourlyJson.data.count, 1);
      assert.equal(hourlyJson.data.stats[0].vehicleId, vehicleId);

      // Test Daily endpoint
      const dailyRes = await fetch(`http://127.0.0.1:${port}/api/analytics/v1/vehicles/${vehicleId}/daily`);
      assert.equal(dailyRes.status, 200);
      const dailyJson = (await dailyRes.json()) as any;
      assert.equal(dailyJson.data.count, 1);

      // Test Trips endpoint
      const tripsRes = await fetch(`http://127.0.0.1:${port}/api/analytics/v1/vehicles/${vehicleId}/trips`);
      assert.equal(tripsRes.status, 200);
      const tripsJson = (await tripsRes.json()) as any;
      assert.equal(tripsJson.data.count, 1);
      assert.equal(tripsJson.data.trips[0].status, "ACTIVE");
    } finally {
      server.close();
    }
  });
});
