import {
  createKafkaClient,
  type Consumer,
  RedisClientWrapper,
  VehicleStateService,
  VehicleGeoService,
  CacheService,
  DistributedLock,
} from "@vehicle-pulse/shared";
import {
  KAFKA_TOPICS,
  TelemetryRawEventSchema,
  type TelemetryRawEvent,
} from "@vehicle-pulse/event-contracts";
import type { Logger } from "@vehicle-pulse/logger";

export interface RedisStateConsumerOptions {
  brokers: string[];
  groupId?: string;
  redisUrl: string;
  logger: Logger;
  fromBeginning?: boolean;
}

let consumerInstance: Consumer | null = null;
let redisWrapperInstance: RedisClientWrapper | null = null;
let stateServiceInstance: VehicleStateService | null = null;
let geoServiceInstance: VehicleGeoService | null = null;
let cacheServiceInstance: CacheService | null = null;
let lockServiceInstance: DistributedLock | null = null;
let isRunning = false;

export const getStateService = (): VehicleStateService | null => stateServiceInstance;
export const getGeoService = (): VehicleGeoService | null => geoServiceInstance;
export const getCacheService = (): CacheService | null => cacheServiceInstance;
export const getLockService = (): DistributedLock | null => lockServiceInstance;
export const getRedisWrapper = (): RedisClientWrapper | null => redisWrapperInstance;

/**
 * Initializes and starts the dedicated Redis State Kafka consumer worker.
 *
 * Architecture:
 * - Group: `telemetry-redis-state-group`
 * - Subscribes to `vehicle.telemetry.raw`
 * - Updates `vehicle:<vehicleId>:state` in Redis atomically using Lua script.
 * - Out-of-order protection: incoming events older than `lastUpdatedTimestamp` are rejected.
 * - Offsets are committed ONLY after state is persisted in Redis.
 */
const startConsumer = async (options: RedisStateConsumerOptions): Promise<void> => {
  if (consumerInstance && isRunning) {
    return;
  }

  const { brokers, groupId = "telemetry-redis-state-group", redisUrl, logger, fromBeginning = false } = options;

  // 1. Initialize Redis Client
  redisWrapperInstance = new RedisClientWrapper({
    url: redisUrl,
    logger,
  });

  const redisClient = redisWrapperInstance.getClient();
  stateServiceInstance = new VehicleStateService(redisClient, logger, {
    ttlSeconds: 86400, // 24 hours
    offlineThresholdSeconds: 60, // 60s without telemetry marks vehicle OFFLINE
  });
  geoServiceInstance = new VehicleGeoService(redisClient, logger);
  cacheServiceInstance = new CacheService(redisClient, logger, {
    ttlSeconds: 300, // 5 minutes cache TTL
    prefix: "vp:cache:",
  });
  lockServiceInstance = new DistributedLock(redisClient, logger, {
    ttlMs: 5000, // 5 seconds default lock TTL
    prefix: "vp:lock:",
  });

  // 2. Initialize Kafka Consumer
  const kafka = createKafkaClient({
    clientId: "telemetry-redis-state-worker",
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
  logger.info({ groupId, topic: KAFKA_TOPICS.TELEMETRY_RAW }, "Redis State & GEO Kafka consumer joined group and started listening");

  await consumerInstance.run({
    autoCommit: false,
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
      for (const message of batch.messages) {
        if (!message.value) {
          resolveOffset(message.offset);
          continue;
        }

        try {
          const raw = JSON.parse(message.value.toString());
          const parseResult = TelemetryRawEventSchema.safeParse(raw);

          if (!parseResult.success) {
            logger.warn({ key: message.key?.toString() }, "Redis State consumer skipping malformed event");
            resolveOffset(message.offset);
            continue;
          }

          const event: TelemetryRawEvent = parseResult.data;

          // 1. Atomically update Redis state with out-of-order protection
          if (stateServiceInstance) {
            await stateServiceInstance.updateFromTelemetry(event);
          }

          // 2. Update Geospatial Index (GEOADD fleet:locations:geo lon lat vehicleId)
          if (geoServiceInstance && event.data?.location) {
            await geoServiceInstance.updateLocation(
              event.vehicleId,
              event.data.location.longitude,
              event.data.location.latitude
            );
          }

          resolveOffset(message.offset);
        } catch (err) {
          logger.error({ err, offset: message.offset }, "Error updating Redis vehicle state/GEO from Kafka batch");
          throw err; // Halts batch to prevent premature offset commit
        }
      }

      await commitOffsetsIfNecessary();
      await heartbeat();
    },
  });
};

const stopConsumer = async (logger: Logger): Promise<void> => {
  if (consumerInstance && isRunning) {
    logger.info("Stopping Redis State Kafka consumer worker...");
    await consumerInstance.stop();
    await consumerInstance.disconnect();
    consumerInstance = null;
    isRunning = false;
  }

  if (redisWrapperInstance) {
    await redisWrapperInstance.disconnect();
    redisWrapperInstance = null;
    stateServiceInstance = null;
    geoServiceInstance = null;
    cacheServiceInstance = null;
    lockServiceInstance = null;
  }

  logger.info("Redis State Kafka consumer worker stopped cleanly");
};

export const TelemetryRedisStateConsumer = {
  startConsumer,
  stopConsumer,
  getStateService,
  getRedisWrapper,
};
