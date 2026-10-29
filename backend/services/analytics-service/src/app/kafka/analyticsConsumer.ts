import { createKafkaClient, type Consumer } from "@vehicle-pulse/shared";
import {
  KAFKA_TOPICS,
  TelemetryRawEventSchema,
  type TelemetryRawEvent,
} from "@vehicle-pulse/event-contracts";
import type { Logger } from "@vehicle-pulse/logger";
import { getPrismaClient } from "../db/prisma.js";
import { processTelemetryEventAggregations } from "../services/aggregation.service.js";


export interface AnalyticsConsumerOptions {
  brokers: string[];
  groupId: string;
  logger: Logger;
  fromBeginning?: boolean;
}


let consumerInstance: Consumer | null = null;
let isRunning = false;

/**
 * Initializes and starts the Analytics Kafka Consumer Group.
 *
 * Architecture:
 * - Group: `analytics-consumer-group`
 * - Subscribes to `vehicle.telemetry.raw`
 * - Idempotency: Records `eventId` in `processed_events` table before / alongside aggregation.
 * - Commits offsets only upon durable processing.
 */
const startConsumer = async (options: AnalyticsConsumerOptions): Promise<void> => {
  if (consumerInstance && isRunning) {
    return;
  }

  const { brokers, groupId, logger, fromBeginning = false } = options;

  const kafka = createKafkaClient({
    clientId: "analytics-worker",
    brokers,
  });

  consumerInstance = kafka.consumer({
    groupId,
    retry: { retries: 5 },
  });

  await consumerInstance.connect();
  await consumerInstance.subscribe({
    topic: KAFKA_TOPICS.TELEMETRY_RAW,
    fromBeginning,
  });


  isRunning = true;
  logger.info({ groupId, topic: KAFKA_TOPICS.TELEMETRY_RAW }, "Analytics Kafka consumer joined group and started listening");

  const prisma = getPrismaClient();

  await consumerInstance.run({
    autoCommit: false,
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, commitOffsetsIfNecessary, heartbeat }) => {
      for (const message of batch.messages) {
        if (!message.value) continue;

        try {
          const raw = JSON.parse(message.value.toString());
          const parseResult = TelemetryRawEventSchema.safeParse(raw);

          if (!parseResult.success) {
            logger.warn({ key: message.key?.toString() }, "Analytics consumer skipping malformed event");
            resolveOffset(message.offset);
            continue;
          }

          const event: TelemetryRawEvent = parseResult.data;

          // Perform durable aggregation & idempotency tracking in PostgreSQL
          await processTelemetryEventAggregations(prisma, event);

          resolveOffset(message.offset);
        } catch (err) {

          logger.error({ err }, "Error processing event in Analytics consumer");
          throw err; // Stop and retry batch without premature offset commit
        }
      }

      await commitOffsetsIfNecessary();
      await heartbeat();
    },
  });
};

const stopConsumer = async (logger: Logger): Promise<void> => {
  if (consumerInstance && isRunning) {
    logger.info("Stopping Analytics Kafka consumer worker...");
    await consumerInstance.stop();
    await consumerInstance.disconnect();
    consumerInstance = null;
    isRunning = false;
    logger.info("Analytics Kafka consumer stopped cleanly");
  }
};

const getConsumerStatus = (): { isRunning: boolean } => ({
  isRunning,
});

export const AnalyticsKafkaConsumer = {
  startConsumer,
  stopConsumer,
  getConsumerStatus,
};
