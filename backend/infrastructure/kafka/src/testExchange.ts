import { randomUUID } from "node:crypto";
import { createKafkaClient } from "@vehicle-pulse/shared";
import { KAFKA_TOPICS, type EventEnvelope, type TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import { getBrokers } from "./topicManager.js";

/**
 * End-to-end event exchange test to verify that producer and consumer
 * communicate successfully over Kafka with partition keying.
 */
export async function runEventExchangeVerification(): Promise<{
  success: boolean;
  receivedEvents: number;
  partitionUsed: number;
  vehicleId: string;
}> {
  const brokers = getBrokers();
  const kafka = createKafkaClient({
    clientId: "vehiclepulse-exchange-verifier",
    brokers,
  });

  const producer = kafka.producer();
  const consumer = kafka.consumer({
    groupId: `test-verifier-group-${Date.now()}`,
  });

  const testVehicleId = "veh_test_phase10_verifier";
  const envelope: TelemetryRawEvent = {
    eventId: randomUUID(),
    eventType: "telemetry.raw",
    version: "1.0.0",
    vehicleId: testVehicleId,
    deviceId: "dev_verifier_001",
    timestamp: new Date().toISOString(),
    data: {
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        heading: 90,
        altitude: 15,
      },
      speed: 65,
      rpm: 2100,
      fuelLevelPercent: 88,
      engineTemperatureCelsius: 82,
      batteryVoltage: 13.9,
      odometerKm: 12000,
      engineStatus: "ON",
      accelerationG: 0.05,
    },
  };

  let receivedEvents = 0;
  let partitionUsed = -1;

  try {
    await producer.connect();
    await consumer.connect();

    await consumer.subscribe({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      fromBeginning: true,
    });

    const receivePromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for Kafka event consumption (15s)"));
      }, 15000);

      consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const keyStr = message.key?.toString();
          if (keyStr === testVehicleId) {
            receivedEvents++;
            partitionUsed = partition;
            clearTimeout(timeout);
            resolve();
          }
        },
      });
    });

    // Send event keyed by vehicleId
    await producer.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: [
        {
          key: testVehicleId,
          value: JSON.stringify(envelope),
        },
      ],
    });

    await receivePromise;

    return {
      success: true,
      receivedEvents,
      partitionUsed,
      vehicleId: testVehicleId,
    };
  } finally {
    await consumer.stop().catch(() => {});
    await consumer.disconnect().catch(() => {});
    await producer.disconnect().catch(() => {});
  }
}

if (process.argv[1]?.endsWith("testExchange.ts") || process.argv[1]?.endsWith("testExchange.js")) {
  console.log("==> Running live Kafka event exchange verification...");
  runEventExchangeVerification()
    .then((res) => {
      console.log("✔ Event exchange verification passed:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("✖ Event exchange verification failed:", err);
      process.exit(1);
    });
}
