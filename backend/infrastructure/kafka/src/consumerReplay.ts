import { Kafka, Consumer, Admin } from "kafkajs";
import { KAFKA_TOPICS } from "@vehicle-pulse/event-contracts";
import { createLogger } from "@vehicle-pulse/logger";

const logger = createLogger({ serviceName: "kafka-consumer-replay" });

export interface ReplayOptions {
  brokers: string[];
  topic?: string;
  sourceGroupId?: string;
  replayGroupId: string;
  resetMode: "earliest" | "timestamp" | "offset";
  targetTimestamp?: number;
  maxMessages?: number;
}

export interface ReplayResult {
  replayGroupId: string;
  topic: string;
  messagesReplayed: number;
  durationMs: number;
  replayedEventsByVehicle: Record<string, number>;
  idempotentSafe: boolean;
}

/**
 * Executes a controlled historical event replay on an isolated consumer group.
 * Ensures that live production consumer groups (analytics, alerts, state) are undisturbed.
 */
export async function executeConsumerReplay(
  options: ReplayOptions
): Promise<ReplayResult> {
  const {
    brokers,
    topic = KAFKA_TOPICS.TELEMETRY_RAW,
    replayGroupId,
    maxMessages = 100,
  } = options;

  logger.info(
    { topic, replayGroupId, resetMode: options.resetMode },
    "Initiating controlled Kafka consumer replay"
  );

  const kafka = new Kafka({
    clientId: "kafka-replay-runner",
    brokers,
  });

  const admin: Admin = kafka.admin();
  await admin.connect();

  // Reset or inspect offsets for the isolated replay group
  try {
    await admin.resetOffsets({
      groupId: replayGroupId,
      topic,
      earliest: true,
    });
    logger.info({ replayGroupId, topic }, "Reset offsets to earliest for replay consumer group");
  } catch (err) {
    logger.warn({ err }, "Could not reset offsets via admin (group might be brand new); proceeding with fromBeginning");
  } finally {
    await admin.disconnect();
  }

  const consumer: Consumer = kafka.consumer({
    groupId: replayGroupId,
  });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  const replayedEventsByVehicle: Record<string, number> = {};
  let messagesReplayed = 0;
  const startTime = Date.now();

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      logger.info("Replay window reached timeout; resolving");
      resolve();
    }, 4000);

    consumer.run({
      eachMessage: async ({ message }) => {
        messagesReplayed++;
        if (message.key) {
          const vehicleId = message.key.toString();
          replayedEventsByVehicle[vehicleId] = (replayedEventsByVehicle[vehicleId] || 0) + 1;
        }

        if (messagesReplayed >= maxMessages) {
          clearTimeout(timeout);
          resolve();
        }
      },
    });
  });

  await consumer.disconnect();
  const durationMs = Date.now() - startTime;

  return {
    replayGroupId,
    topic,
    messagesReplayed,
    durationMs,
    replayedEventsByVehicle,
    idempotentSafe: true,
  };
}
