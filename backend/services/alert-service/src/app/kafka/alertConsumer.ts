import { createKafkaClient, type Consumer } from "@vehicle-pulse/shared";
import {
  KAFKA_TOPICS,
  TelemetryRawEventSchema,
  type TelemetryRawEvent,
} from "@vehicle-pulse/event-contracts";
import type { Logger } from "@vehicle-pulse/logger";
import { getPrismaClient } from "../db/prisma.js";
import { evaluateAndPersistTelemetryAlerts } from "../services/alertEvaluator.service.js";

export interface AlertConsumerOptions {
  brokers: string[];
  groupId: string;
  logger: Logger;
  fromBeginning?: boolean;
}

let consumerInstance: Consumer | null = null;
let isRunning = false;

// Observability metrics for consumer lag and throughput
export interface AlertConsumerMetrics {
  messagesProcessed: number;
  alertsCreatedOrAppended: number;
  poisonMessagesSkipped: number;
  processingErrors: number;
  lastHeartbeatTime: number;
  isRunning: boolean;
}

const metrics: AlertConsumerMetrics = {
  messagesProcessed: 0,
  alertsCreatedOrAppended: 0,
  poisonMessagesSkipped: 0,
  processingErrors: 0,
  lastHeartbeatTime: Date.now(),
  isRunning: false,
};

export const getAlertConsumerMetrics = (): Readonly<AlertConsumerMetrics> => ({
  ...metrics,
  isRunning,
});

/**
 * Initializes and starts the dedicated Alert Kafka Consumer Group.
 *
 * Architecture & Reliability Guarantees:
 * 1. Dedicated Group: `alert-service-group` (independent from analytics consumer group).
 * 2. Topic: Subscribes to `vehicle.telemetry.raw`.
 * 3. Poison-Pill Resilience: Malformed or unparseable JSON payloads are safely logged
 *    and resolved (dead-letter policy) without crashing the consumer partition loop.
 * 4. Safe Offset Commits: Offsets are committed ONLY after durable evaluation and
 *    MySQL persistence finishes.
 * 5. Deduplication: Re-delivered messages pass through the alert cooldown deduplication engine.
 */
export const startAlertConsumer = async (options: AlertConsumerOptions): Promise<void> => {
  if (consumerInstance && isRunning) {
    return;
  }

  const { brokers, groupId, logger, fromBeginning = false } = options;

  const kafka = createKafkaClient({
    clientId: "alert-worker",
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
  metrics.isRunning = true;
  logger.info({ groupId, topic: KAFKA_TOPICS.TELEMETRY_RAW }, "Alert Kafka consumer joined group and started listening");

  const prisma = getPrismaClient();

  await consumerInstance.run({
    autoCommit: false,
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, commitOffsetsIfNecessary, heartbeat }) => {
      for (const message of batch.messages) {
        if (!message.value) {
          resolveOffset(message.offset);
          continue;
        }

        try {
          let raw: unknown;
          try {
            raw = JSON.parse(message.value.toString());
          } catch (jsonErr) {
            // Poison message: Non-JSON payload
            logger.error(
              { key: message.key?.toString(), offset: message.offset, jsonErr },
              "Poison message encountered: Invalid JSON. Skipping offset to prevent poison pill halt"
            );
            metrics.poisonMessagesSkipped++;
            resolveOffset(message.offset);
            continue;
          }

          const parseResult = TelemetryRawEventSchema.safeParse(raw);
          if (!parseResult.success) {
            // Poison message: Schema contract mismatch
            logger.warn(
              { key: message.key?.toString(), offset: message.offset, issues: parseResult.error.issues },
              "Poison message encountered: Schema validation failure. Skipping offset"
            );
            metrics.poisonMessagesSkipped++;
            resolveOffset(message.offset);
            continue;
          }

          const event: TelemetryRawEvent = parseResult.data;

          // Pure evaluation + cooldown deduplication + MySQL persistence
          const count = await evaluateAndPersistTelemetryAlerts(prisma, event, logger);
          metrics.alertsCreatedOrAppended += count;
          metrics.messagesProcessed++;

          // Acknowledge this message in the batch
          resolveOffset(message.offset);
        } catch (err) {
          metrics.processingErrors++;
          logger.error({ err, offset: message.offset }, "Transient error processing event in Alert consumer; halting batch for retry");
          throw err; // Stop and retry batch without premature offset commit
        }
      }

      // Commit offsets only after all messages in batch have been durably persisted
      await commitOffsetsIfNecessary();
      await heartbeat();
      metrics.lastHeartbeatTime = Date.now();
    },
  });
};

export const stopAlertConsumer = async (logger: Logger): Promise<void> => {
  if (consumerInstance && isRunning) {
    logger.info("Stopping Alert Kafka consumer worker...");
    await consumerInstance.stop();
    await consumerInstance.disconnect();
    consumerInstance = null;
    isRunning = false;
    metrics.isRunning = false;
    logger.info("Alert Kafka consumer worker stopped cleanly");
  }
};
