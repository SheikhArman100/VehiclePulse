import { createLogger } from "@vehicle-pulse/logger";
import { registerGracefulShutdown } from "@vehicle-pulse/shared";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const logger = createLogger({
  serviceName: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
});

const app = createApp({ logger });

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `Telemetry Service started and listening on port ${env.PORT}`
  );
});

registerGracefulShutdown({
  server,
  logger,
  serviceName: env.SERVICE_NAME,
  onShutdown: async () => {
    logger.info("Cleaning up telemetry service resources before exit...");
  },
});
