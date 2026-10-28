import { createLogger } from "@vehicle-pulse/logger";
import { registerGracefulShutdown } from "@vehicle-pulse/shared";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./app/db/database.js";

const logger = createLogger({
  serviceName: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
});

async function main() {
  try {
    // 1. Connect to MongoDB
    await connectDatabase(env.MONGODB_URI, logger);

    // 2. Start HTTP server
    const app = createApp({ logger });
    const server = app.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, env: env.NODE_ENV },
        `Telemetry Service started and listening on port ${env.PORT}`
      );
    });

    // 3. Register graceful shutdown
    registerGracefulShutdown({
      server,
      logger,
      serviceName: env.SERVICE_NAME,
      onShutdown: async () => {
        logger.info("Closing MongoDB connections on graceful shutdown...");
        await disconnectDatabase(logger);
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to start Telemetry Service");
    process.exit(1);
  }
}

main();
