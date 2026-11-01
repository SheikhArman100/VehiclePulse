import { createLogger } from "@vehicle-pulse/logger";
import { registerGracefulShutdown } from "@vehicle-pulse/shared";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./app/db/database.js";
import { TelemetryKafkaProducer } from "./app/kafka/telemetryProducer.js";
import { TelemetryMongoConsumer } from "./app/kafka/mongoConsumer.js";
import { TelemetryRedisStateConsumer } from "./app/kafka/redisStateConsumer.js";

const logger = createLogger({
  serviceName: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
});

async function main() {
  try {
    // 1. Connect to MongoDB
    await connectDatabase(env.MONGODB_URI, logger);

    // 2. Connect to Kafka Producer
    const brokers = env.KAFKA_BROKERS.split(",").map((s) => s.trim());
    await TelemetryKafkaProducer.initProducer({
      brokers,
      clientId: `${env.SERVICE_NAME}-producer`,
      logger,
    });

    // 3. Start decoupled MongoDB Kafka Consumer Worker (Kafka-First Storage)
    await TelemetryMongoConsumer.startConsumer({
      brokers,
      groupId: "telemetry-mongo-storage-group",
      logger,
    });

    // 4. Start Redis Real-Time State Consumer Worker (Phase 21)
    const rawRedisUrl = env.REDIS_URL || "redis://localhost:6379";
    const resolvedRedisUrl =
      rawRedisUrl.includes("@redis:") && !process.env.RUNNING_IN_DOCKER
        ? rawRedisUrl.replace("@redis:", "@localhost:")
        : rawRedisUrl;

    await TelemetryRedisStateConsumer.startConsumer({
      brokers,
      groupId: "telemetry-redis-state-group",
      redisUrl: resolvedRedisUrl,
      logger,
    });

    // 5. Start HTTP server
    const app = createApp({ logger });
    const server = app.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, env: env.NODE_ENV },
        `Telemetry Service started and listening on port ${env.PORT}`
      );
    });

    // 6. Register graceful shutdown
    registerGracefulShutdown({
      server,
      logger,
      serviceName: env.SERVICE_NAME,
      onShutdown: async () => {
        logger.info("Closing MongoDB, Redis, and Kafka connections on graceful shutdown...");
        await TelemetryRedisStateConsumer.stopConsumer(logger);
        await TelemetryMongoConsumer.stopConsumer(logger);
        await TelemetryKafkaProducer.disconnectProducer(logger);
        await disconnectDatabase(logger);
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to start Telemetry Service");
    process.exit(1);
  }
}

main();
