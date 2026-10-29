import http from "node:http";
import { createLogger } from "@vehicle-pulse/logger";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectMySQL, disconnectMySQL } from "./app/db/prisma.js";
import { startAlertConsumer, stopAlertConsumer } from "./app/kafka/alertConsumer.js";

const logger = createLogger({
  serviceName: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
});

async function bootstrap() {
  logger.info({ service: env.SERVICE_NAME, port: env.PORT }, "Starting Alert Service...");

  try {
    // 1. Connect to MySQL database
    await connectMySQL(logger);

    // 2. Initialize Express application
    const app = createApp({ logger });
    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, `Alert Service started and listening on port ${env.PORT}`);
    });

    // 3. Start Kafka Alert Consumer
    const brokers = env.KAFKA_BROKERS.split(",").map((b) => b.trim());
    startAlertConsumer({
      brokers,
      groupId: env.KAFKA_GROUP_ID,
      logger,
      fromBeginning: false,
    }).catch((err) => {
      logger.error({ err }, "Failed to start Kafka Alert Consumer worker");
    });

    // 4. Graceful shutdown handler
    const handleShutdown = async (signal: string) => {
      logger.info({ signal }, `Received ${signal}. Shutting down Alert Service gracefully...`);
      server.close(async () => {
        try {
          await stopAlertConsumer(logger);
          await disconnectMySQL(logger);
          logger.info("Graceful shutdown completed");
          process.exit(0);
        } catch (err) {
          logger.error({ err }, "Error during graceful shutdown");
          process.exit(1);
        }
      });

      // Force kill if shutdown hangs
      setTimeout(() => {
        logger.fatal("Forced shutdown after 10s timeout");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));
  } catch (err) {
    logger.fatal({ err }, "Fatal error during Alert Service bootstrap");
    process.exit(1);
  }
}

bootstrap();
