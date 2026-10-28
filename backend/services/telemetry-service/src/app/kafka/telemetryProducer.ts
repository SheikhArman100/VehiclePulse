import { createKafkaClient, type Producer } from "@vehicle-pulse/shared";
import {
  KAFKA_TOPICS,
  TelemetryRawEventSchema,
  type TelemetryRawEvent,
} from "@vehicle-pulse/event-contracts";
import type { Logger } from "@vehicle-pulse/logger";

export interface TelemetryProducerOptions {
  brokers: string[];
  clientId?: string;
  logger: Logger;
}

export interface PublishResult {
  published: boolean;
  topic: string;
  partition?: number;
  offset?: string;
  error?: string;
}

let producerInstance: Producer | null = null;
let isConnected = false;

/**
 * Initializes and connects the KafkaJS producer for Telemetry Service.
 */
const initProducer = async (options: TelemetryProducerOptions): Promise<Producer> => {
  if (producerInstance && isConnected) {
    return producerInstance;
  }

  const kafka = createKafkaClient({
    clientId: options.clientId || "telemetry-service-producer",
    brokers: options.brokers,
  });

  producerInstance = kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: true, // Idempotent producer guarantees exactly-once delivery within a single session
    maxInFlightRequests: 1, // Required when idempotent is true
    retry: {
      initialRetryTime: 100,
      retries: 5,
    },
  });

  await producerInstance.connect();
  isConnected = true;
  options.logger.info("Kafka producer successfully connected for Telemetry Service");

  return producerInstance;
};

/**
 * Disconnects the Kafka producer during graceful shutdown.
 */
const disconnectProducer = async (logger: Logger): Promise<void> => {
  if (producerInstance && isConnected) {
    logger.info("Disconnecting Kafka producer...");
    await producerInstance.disconnect();
    isConnected = false;
    producerInstance = null;
    logger.info("Kafka producer disconnected successfully");
  }
};

/**
 * Publishes a validated TelemetryRawEvent to `vehicle.telemetry.raw`.
 *
 * Guarantees:
 * - Validated strictly against TelemetryRawEventSchema before publishing.
 * - Partition key is explicitly `event.vehicleId` ensuring per-vehicle ordering.
 */
const publishTelemetryEvent = async (
  event: unknown,
  logger: Logger
): Promise<PublishResult> => {
  if (!producerInstance || !isConnected) {
    throw new Error("Kafka producer is not connected. Call initProducer first.");
  }

  // 1. Validate event schema strictly
  const parseResult = TelemetryRawEventSchema.safeParse(event);
  if (!parseResult.success) {
    const errorMsg = `Invalid telemetry event contract: ${parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`;
    logger.warn({ errors: parseResult.error.format() }, errorMsg);
    return {
      published: false,
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      error: errorMsg,
    };
  }

  const validatedEvent: TelemetryRawEvent = parseResult.data;

  // 2. Publish to Kafka with partition key = vehicleId
  try {
    const recordMetadata = await producerInstance.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: [
        {
          key: validatedEvent.vehicleId,
          value: JSON.stringify(validatedEvent),
          timestamp: new Date(validatedEvent.timestamp).getTime().toString(),
          headers: {
            "x-event-id": validatedEvent.eventId,
            "x-event-type": validatedEvent.eventType,
            "x-version": validatedEvent.version,
            "x-source": "telemetry-service",
          },
        },
      ],
    });

    const meta = recordMetadata[0];
    return {
      published: true,
      topic: meta.topicName,
      partition: meta.partition,
      offset: meta.baseOffset,
    };
  } catch (error) {
    logger.error({ error, vehicleId: validatedEvent.vehicleId }, "Failed to publish telemetry event to Kafka");
    throw error;
  }
};

/**
 * Publishes a batch of telemetry events.
 */
const publishTelemetryBatch = async (
  events: unknown[],
  logger: Logger
): Promise<{ publishedCount: number; errors: string[] }> => {
  if (!producerInstance || !isConnected) {
    throw new Error("Kafka producer is not connected. Call initProducer first.");
  }

  logger.debug({ count: events.length }, "Publishing telemetry batch to Kafka");

  const validMessages: Array<{
    key: string;
    value: string;
    timestamp: string;
    headers: Record<string, string>;
  }> = [];
  const errors: string[] = [];

  for (const raw of events) {
    const parseResult = TelemetryRawEventSchema.safeParse(raw);
    if (!parseResult.success) {
      errors.push(
        parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      );
      continue;
    }

    const event = parseResult.data;
    validMessages.push({
      key: event.vehicleId,
      value: JSON.stringify(event),
      timestamp: new Date(event.timestamp).getTime().toString(),
      headers: {
        "x-event-id": event.eventId,
        "x-event-type": event.eventType,
        "x-version": event.version,
        "x-source": "telemetry-service",
      },
    });
  }

  if (validMessages.length > 0) {
    await producerInstance.send({
      topic: KAFKA_TOPICS.TELEMETRY_RAW,
      messages: validMessages,
    });
  }

  return {
    publishedCount: validMessages.length,
    errors,
  };
};

const getProducerStatus = (): { isConnected: boolean } => ({
  isConnected,
});

export const TelemetryKafkaProducer = {
  initProducer,
  disconnectProducer,
  publishTelemetryEvent,
  publishTelemetryBatch,
  getProducerStatus,
};
