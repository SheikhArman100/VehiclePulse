import { createKafkaClient } from "@vehicle-pulse/shared";
import { KAFKA_TOPICS, type TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import { createLogger } from "@vehicle-pulse/logger";
import { StatefulVehicleModel } from "@vehicle-pulse/telemetry-generator/dist/vehicleModel.js";

const logger = createLogger({ serviceName: "e2e-slice-verifier", level: "info" });

export interface E2ESliceResult {
  success: boolean;
  eventsSent: number;
  eventsReceived: number;
  distinctVehicles: string[];
  partitionsHit: number[];
  sampleEvent?: TelemetryRawEvent;
  durationMs: number;
}

export async function runEndToEndSliceVerification(options: {
  vehicleCount?: number;
  eventsPerVehicle?: number;
  endpointUrl?: string;
  brokers?: string[];
} = {}): Promise<E2ESliceResult> {
  const vehicleCount = options.vehicleCount ?? 3;
  const eventsPerVehicle = options.eventsPerVehicle ?? 5;
  const endpointUrl = options.endpointUrl ?? "http://localhost/api/telemetry/v1/telemetry";
  const brokers = options.brokers ?? ["localhost:9092"];

  const targetEventCount = vehicleCount * eventsPerVehicle;
  const runId = `e2e_${Date.now()}`;
  const testVehicleIds = Array.from({ length: vehicleCount }, (_, i) => `veh_${runId}_${i + 1}`);

  logger.info({ vehicleCount, eventsPerVehicle, endpointUrl, targetEventCount }, "Starting End-to-End slice verification");

  // 1. Prepare Consumer listening on Kafka topic vehicle.telemetry.raw
  const kafka = createKafkaClient({
    clientId: `verifier-${runId}`,
    brokers,
  });
  const consumer = kafka.consumer({
    groupId: `e2e-group-${runId}`,
  });

  const receivedEvents: TelemetryRawEvent[] = [];
  const partitionsHit = new Set<number>();

  await consumer.connect();
  await consumer.subscribe({
    topic: KAFKA_TOPICS.TELEMETRY_RAW,
    fromBeginning: true,
  });

  const startTime = Date.now();

  const consumptionPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      consumer.stop().catch(() => {});
      reject(
        new Error(
          `E2E slice timed out (20s). Received ${receivedEvents.length}/${targetEventCount} target events.`
        )
      );
    }, 20000);

    consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const key = message.key?.toString();
        if (key && testVehicleIds.includes(key)) {
          partitionsHit.add(partition);
          const parsed = JSON.parse(message.value?.toString() || "{}");
          receivedEvents.push(parsed);

          if (receivedEvents.length >= targetEventCount) {
            clearTimeout(timeout);
            resolve();
          }
        }
      },
    });
  });

  // Brief pause for consumer rebalance / assignment
  await new Promise((r) => setTimeout(r, 1200));

  // 2. Run simulator models and dispatch HTTP requests through Nginx proxy
  const vehicles = testVehicleIds.map(
    (vId, i) => new StatefulVehicleModel(vId, `dev_${vId}`, `VIN${vId}`, 1000 + i)
  );

  let sentCount = 0;
  for (let round = 1; round <= eventsPerVehicle; round++) {
    for (const vehicle of vehicles) {
      const event = vehicle.tick(1.0);

      const res = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        throw new Error(`HTTP ingestion failed with status ${res.status}: ${await res.text()}`);
      }

      sentCount++;
      // Brief spacing between emission rounds
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  // 3. Await consumer fulfillment
  await consumptionPromise;
  await consumer.stop().catch(() => {});
  await consumer.disconnect().catch(() => {});

  const durationMs = Date.now() - startTime;
  const distinctVehicles = Array.from(new Set(receivedEvents.map((e) => e.vehicleId)));

  return {
    success: true,
    eventsSent: sentCount,
    eventsReceived: receivedEvents.length,
    distinctVehicles,
    partitionsHit: Array.from(partitionsHit),
    sampleEvent: receivedEvents[0],
    durationMs,
  };
}

// Direct CLI execution
if (process.argv[1]?.endsWith("e2eSlice.ts") || process.argv[1]?.endsWith("e2eSlice.js")) {
  runEndToEndSliceVerification()
    .then((result) => {
      console.log("✔ End-to-End backend slice passed successfully!");
      console.log({
        eventsSent: result.eventsSent,
        eventsReceived: result.eventsReceived,
        distinctVehicles: result.distinctVehicles,
        partitionsHit: result.partitionsHit,
        durationMs: result.durationMs,
        sampleEventId: result.sampleEvent?.eventId,
        sampleVehicleId: result.sampleEvent?.vehicleId,
        sampleSpeed: result.sampleEvent?.data.speed,
      });
      process.exit(0);
    })
    .catch((err) => {
      console.error("✖ End-to-End backend slice failed:", err);
      process.exit(1);
    });
}
