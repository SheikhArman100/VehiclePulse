import { createKafkaClient, type Consumer } from "@vehicle-pulse/shared";
import {
  KAFKA_TOPICS,
  TelemetryRawEventSchema,
  type TelemetryRawEvent,
} from "@vehicle-pulse/event-contracts";
import type { Logger } from "@vehicle-pulse/logger";
import { TelemetryService } from "../modules/telemetry/telemetry.service.js";

export interface MongoConsumerOptions {
  brokers: string[];
  groupId?: string;
  logger: Logger;
  batchSize?: number;
}

let consumerInstance: Consumer | null = null;
let isRunning = false;

/**
 * Initializes and starts the decoupled MongoDB Kafka consumer worker.
 *
 * Architecture:
 * - Belongs to dedicated consumer group `telemetry-mongo-storage-group`.
 * - Reads from `vehicle.telemetry.raw`.
 * - Commits offsets ONLY AFTER durable persistence into MongoDB Time-Series collection.
 */
const startConsumer = async (options: MongoConsumerOptions): Promise<void> => {
  if (consumerInstance && isRunning) {
    return;
  }

  const { brokers, groupId = "telemetry-mongo-storage-group", logger } = options;

  const kafka = createKafkaClient({
    clientId: "telemetry-mongo-worker",
    brokers,
  });

  consumerInstance = kafka.consumer({
    groupId,
    retry: { retries: 5 },
  });

  await consumerInstance.connect();
  await consumerInstance.subscribe({
    topic: KAFKA_TOPICS.TELEMETRY_RAW,
    fromBeginning: false,
  });

  isRunning = true;
  logger.info({ groupId, topic: KAFKA_TOPICS.TELEMETRY_RAW }, "MongoDB Kafka consumer worker subscribed and starting");

  // Run batch consumer with explicit offset management
  await consumerInstance.run({
    autoCommit: false, // Explicit commit ensures at-least-once delivery with zero data loss
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
      const validEvents: TelemetryRawEvent[] = [];

      for (const message of batch.messages) {
        if (!message.value) continue;

        try {
          const raw = JSON.parse(message.value.toString());
          const parseResult = TelemetryRawEventSchema.safeParse(raw);

          if (parseResult.success) {
            validEvents.push(parseResult.data);
          } else {
            logger.warn({ key: message.key?.toString() }, "Skipping malformed message on MongoDB storage consumer");
          }
        } catch (err) {
          logger.error({ err }, "Failed to deserialize message on MongoDB storage consumer");
        }
      }

      // 1. Bulk insert to MongoDB Time-Series collection
      if (validEvents.length > 0) {
        try {
          await TelemetryService.bulkInsertFromKafkaEvents(validEvents);
          logger.debug({ count: validEvents.length, partition: batch.partition }, "Bulk inserted telemetry batch to MongoDB");
        } catch (dbErr) {
          logger.error({ dbErr, count: validEvents.length }, "MongoDB bulk write failed; backpressure holding Kafka offset");
          throw dbErr; // Trigger Kafka consumer retry; DO NOT commit offset on failure!
        }
      }

      // 2. Mark and commit offsets only after database write succeeds
      for (const message of batch.messages) {
        resolveOffset(message.offset);
      }
      await commitOffsetsIfNecessary();
      await heartbeat();
    },
  });
};

/**
 * Stops and disconnects the consumer worker cleanly during graceful shutdown.
 */
const stopConsumer = async (logger: Logger): Promise<void> => {
  if (consumerInstance && isRunning) {
    logger.info("Stopping MongoDB Kafka consumer worker...");
    await consumerInstance.stop();
    await consumerInstance.disconnect();
    isRunning = false;
    consumerInstance = null;
    logger.info("MongoDB Kafka consumer worker stopped cleanly");
  }
};

const getConsumerStatus = (): { isRunning: boolean } => ({
  isRunning,
});

export const TelemetryMongoConsumer = {
  startConsumer,
  stopConsumer,
  getConsumerStatus,
};
