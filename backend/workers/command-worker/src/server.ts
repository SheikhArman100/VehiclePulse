import { createLogger } from "@vehicle-pulse/logger";
import {
  RabbitMQClient,
  RABBITMQ_QUEUES,
} from "@vehicle-pulse/shared";
import {
  CommandDispatchedEventSchema,
  type CommandDispatchedEvent,
} from "@vehicle-pulse/event-contracts";
import { env } from "./config/env.js";
import { CommandProcessor } from "./services/commandProcessor.js";

const logger = createLogger({
  serviceName: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
});

async function main() {
  logger.info({ service: env.SERVICE_NAME }, "Starting Vehicle Command Worker...");

  const rabbit = new RabbitMQClient({
    url: env.RABBITMQ_URL,
    logger,
  });

  try {
    // 1. Assert topology (exchanges, queues, DLQ, TTL retry queue)
    await rabbit.setupTopology();

    // 2. Consume from main command execution queue
    await rabbit.consume<CommandDispatchedEvent>(
      RABBITMQ_QUEUES.COMMAND_EXECUTE,
      async (event, rawMsg) => {
        const parseResult = CommandDispatchedEventSchema.safeParse(event);
        if (!parseResult.success) {
          logger.error(
            { issues: parseResult.error.issues, routingKey: rawMsg.fields.routingKey },
            "Poison command message: Schema validation failed. Throwing to trigger DLQ"
          );
          throw new Error("Invalid command schema payload");
        }

        // Process command
        await CommandProcessor.execute(parseResult.data, logger);
      },
      {
        prefetch: env.PREFETCH,
        maxRetries: env.MAX_RETRIES,
      }
    );

    logger.info("Vehicle Command Worker listening for commands on RabbitMQ");

    // Graceful shutdown
    const handleShutdown = async (signal: string) => {
      logger.info({ signal }, "Shutting down Command Worker cleanly...");
      await rabbit.close();
      process.exit(0);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  } catch (err) {
    logger.fatal({ err }, "Fatal error starting Vehicle Command Worker");
    process.exit(1);
  }
}

main();
