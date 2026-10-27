import { Server } from "http";
import { Logger } from "@vehicle-pulse/logger";

export interface GracefulShutdownOptions {
  server: Server;
  logger: Logger;
  serviceName: string;
  timeoutMs?: number;
  onShutdown?: () => Promise<void>;
}

/**
 * Attaches SIGTERM and SIGINT listeners to ensure safe connection draining and resource cleanup.
 */
export function registerGracefulShutdown(options: GracefulShutdownOptions): void {
  const { server, logger, serviceName, timeoutMs = 10000, onShutdown } = options;
  let isShuttingDown = false;

  const handleSignal = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, `[${serviceName}] ${signal} received. Commencing graceful shutdown...`);

    // Force exit if cleanup hangs beyond timeout
    const forceExitTimer = setTimeout(() => {
      logger.error(`[${serviceName}] Graceful shutdown timed out (${timeoutMs}ms). Forcing exit.`);
      process.exit(1);
    }, timeoutMs);

    forceExitTimer.unref();

    // Stop accepting new HTTP requests
    server.close(async (err) => {
      if (err) {
        logger.error({ err }, `[${serviceName}] Error while closing HTTP server.`);
      } else {
        logger.info(`[${serviceName}] HTTP server connections drained.`);
      }

      if (onShutdown) {
        try {
          await onShutdown();
          logger.info(`[${serviceName}] Custom shutdown hooks completed.`);
        } catch (cleanupErr) {
          logger.error({ err: cleanupErr }, `[${serviceName}] Error during custom shutdown hooks.`);
          process.exit(1);
        }
      }

      logger.info(`[${serviceName}] Graceful shutdown completed cleanly.`);
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => handleSignal("SIGTERM"));
  process.on("SIGINT", () => handleSignal("SIGINT"));
}
