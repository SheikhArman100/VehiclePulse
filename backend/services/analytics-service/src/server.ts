import { createLogger } from "@vehicle-pulse/logger";
import { registerGracefulShutdown } from "@vehicle-pulse/shared";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectPostgres, disconnectPostgres } from "./app/db/prisma.js";
import { AnalyticsKafkaConsumer } from "./app/kafka/analyticsConsumer.js";

const logger = createLogger({
  serviceName: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
});

async function main() {
  try {
    // 1. Connect to PostgreSQL
    await connectPostgres(logger);

    // 2. Start Kafka Consumer Group
    const brokers = env.KAFKA_BROKERS.split(",").map((s) => s.trim());
    await AnalyticsKafkaConsumer.startConsumer({
      brokers,
      groupId: env.KAFKA_GROUP_ID,
      logger,
    });

    // 3. Start HTTP Server
    const app = createApp({ logger });
    const server = app.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, env: env.NODE_ENV },
        `Analytics Service started and listening on port ${env.PORT}`
      );
    });

    // 4. Graceful Shutdown
    registerGracefulShutdown({
      server,
      logger,
      serviceName: env.SERVICE_NAME,
      onShutdown: async () => {
        logger.info("Closing PostgreSQL and Kafka connections on graceful shutdown...");
        await AnalyticsKafkaConsumer.stopConsumer(logger);
        await disconnectPostgres(logger);
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to start Analytics Service");
    process.exit(1);
  }
}

main();
