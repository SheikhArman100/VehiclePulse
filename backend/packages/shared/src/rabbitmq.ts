import amqplib, { type Channel, type ChannelModel, type Options } from "amqplib";
import type { Logger } from "@vehicle-pulse/logger";

export interface RabbitMQConfig {
  url: string;
  logger: Logger;
}

/**
 * Standard RabbitMQ Exchange Names across VehiclePulse
 */
export const RABBITMQ_EXCHANGES = {
  COMMAND: "vehicle.command.exchange",
  NOTIFICATION: "notification.exchange",
  ALERT: "alert.exchange",
  DLQ: "dlq.exchange",
} as const;

/**
 * Standard RabbitMQ Queue Names
 */
export const RABBITMQ_QUEUES = {
  COMMAND_EXECUTE: "vehicle.command.execute",
  COMMAND_RETRY: "vehicle.command.retry",
  COMMAND_DLQ: "vehicle.command.dlq",
  NOTIFICATION_EMAIL: "notification.email",
  NOTIFICATION_SMS: "notification.sms",
} as const;

export interface PublishOptions {
  correlationId?: string;
  messageId?: string;
  headers?: Record<string, unknown>;
  priority?: number;
  expiration?: string | number;
}

/**
 * Enterprise RabbitMQ Client Wrapper
 * Supports:
 * - Durable Exchanges (direct & topic)
 * - Dead Letter Exchanges (DLX) & Dead Letter Queues (DLQ)
 * - Publisher Confirms
 * - Manual ACKs with bounded retry headers (x-death / x-retry-count)
 * - Controlled prefetch
 */
export class RabbitMQClient {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;

  constructor(private readonly config: RabbitMQConfig) {}

  public async connect(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    if (this.isConnecting) {
      // Wait for ongoing connection
      await new Promise((r) => setTimeout(r, 200));
      if (this.channel) return this.channel;
    }

    this.isConnecting = true;
    try {
      this.config.logger.info("Connecting to RabbitMQ broker...");
      this.connection = await amqplib.connect(this.config.url);

      this.connection.on("error", (err) => {
        this.config.logger.error({ err }, "RabbitMQ connection error");
      });

      this.connection.on("close", () => {
        this.config.logger.warn("RabbitMQ connection closed");
        this.channel = null;
        this.connection = null;
      });

      this.channel = await this.connection.createChannel();
      this.config.logger.info("RabbitMQ connection & channel established successfully");
      return this.channel;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Asserts durable exchanges, queues, and dead-letter queue (DLQ) topology
   */
  public async setupTopology(): Promise<void> {
    const ch = await this.connect();

    // 1. Assert Dead Letter Exchange (DLX) & DLQ
    await ch.assertExchange(RABBITMQ_EXCHANGES.DLQ, "direct", { durable: true });
    await ch.assertQueue(RABBITMQ_QUEUES.COMMAND_DLQ, { durable: true });
    await ch.bindQueue(RABBITMQ_QUEUES.COMMAND_DLQ, RABBITMQ_EXCHANGES.DLQ, "command.failed");

    // 2. Assert Command Exchange
    await ch.assertExchange(RABBITMQ_EXCHANGES.COMMAND, "direct", { durable: true });

    // 3. Assert Main Command Execution Queue with Dead Letter routing
    await ch.assertQueue(RABBITMQ_QUEUES.COMMAND_EXECUTE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": RABBITMQ_EXCHANGES.DLQ,
        "x-dead-letter-routing-key": "command.failed",
      },
    });
    await ch.bindQueue(RABBITMQ_QUEUES.COMMAND_EXECUTE, RABBITMQ_EXCHANGES.COMMAND, "command.execute");

    // 4. Assert Command Retry Queue with Message TTL (Dead Letter back to main execute queue)
    await ch.assertQueue(RABBITMQ_QUEUES.COMMAND_RETRY, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": RABBITMQ_EXCHANGES.COMMAND,
        "x-dead-letter-routing-key": "command.execute",
        "x-message-ttl": 5000, // 5 seconds exponential backoff base
      },
    });
    await ch.bindQueue(RABBITMQ_QUEUES.COMMAND_RETRY, RABBITMQ_EXCHANGES.COMMAND, "command.retry");

    // 5. Assert Notification Exchange & Queues
    await ch.assertExchange(RABBITMQ_EXCHANGES.NOTIFICATION, "topic", { durable: true });
    await ch.assertQueue(RABBITMQ_QUEUES.NOTIFICATION_EMAIL, { durable: true });
    await ch.bindQueue(RABBITMQ_QUEUES.NOTIFICATION_EMAIL, RABBITMQ_EXCHANGES.NOTIFICATION, "notification.email.#");

    this.config.logger.info("RabbitMQ topology asserted (exchanges, queues, DLQ, TTL retries)");
  }

  /**
   * Publishes a persistent message to an exchange
   */
  public async publish(
    exchange: string,
    routingKey: string,
    content: unknown,
    options: PublishOptions = {}
  ): Promise<boolean> {
    const ch = await this.connect();
    const payload = Buffer.from(JSON.stringify(content));

    const publishOptions: Options.Publish = {
      persistent: true,
      contentType: "application/json",
      timestamp: Date.now(),
      correlationId: options.correlationId,
      messageId: options.messageId,
      headers: options.headers,
      priority: options.priority,
      expiration: options.expiration ? String(options.expiration) : undefined,
    };

    return ch.publish(exchange, routingKey, payload, publishOptions);
  }

  /**
   * Consumes messages with manual ACK/NACK and bounded retries
   */
  public async consume<T = unknown>(
    queue: string,
    onMessage: (msg: T, rawMsg: amqplib.ConsumeMessage) => Promise<void>,
    options: { prefetch?: number; maxRetries?: number } = {}
  ): Promise<void> {
    const ch = await this.connect();
    const prefetch = options.prefetch ?? 10;
    const maxRetries = options.maxRetries ?? 3;

    await ch.prefetch(prefetch);

    await ch.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        let parsed: T;
        try {
          parsed = JSON.parse(msg.content.toString()) as T;
        } catch (jsonErr) {
          // Poison message: Non-JSON payload immediately sent to DLQ (requeue: false)
          this.config.logger.error(
            { jsonErr, deliveryTag: msg.fields.deliveryTag },
            "Poison message: Invalid JSON. Rejecting to DLQ without requeue"
          );
          ch.nack(msg, false, false);
          return;
        }

        try {
          await onMessage(parsed, msg);
          ch.ack(msg);
        } catch (err) {
          const currentRetries = (msg.properties.headers?.["x-retry-count"] as number) || 0;
          this.config.logger.warn(
            { err, currentRetries, maxRetries, routingKey: msg.fields.routingKey },
            "Error processing RabbitMQ message"
          );

          if (currentRetries < maxRetries) {
            // Re-publish to retry queue with incremented retry count
            const nextRetries = currentRetries + 1;
            this.config.logger.info(
              { nextRetries, maxRetries },
              "Scheduling message retry via TTL retry queue"
            );

            await this.publish(
              RABBITMQ_EXCHANGES.COMMAND,
              "command.retry",
              parsed,
              {
                correlationId: msg.properties.correlationId,
                messageId: msg.properties.messageId,
                headers: {
                  ...msg.properties.headers,
                  "x-retry-count": nextRetries,
                  "x-original-routing-key": msg.fields.routingKey,
                },
              }
            );

            ch.ack(msg); // ACK original since new message was durably forwarded to retry queue
          } else {
            // Max retries exhausted: send permanently to DLQ
            this.config.logger.error(
              { currentRetries, maxRetries },
              "Max retries exhausted. Rejecting message to DLQ"
            );
            ch.nack(msg, false, false); // NACK without requeue routes to x-dead-letter-exchange
          }
        }
      },
      { noAck: false }
    );
  }

  public async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.config.logger.info("RabbitMQ connection closed cleanly");
    } catch (err) {
      this.config.logger.warn({ err }, "Error closing RabbitMQ connection");
    }
  }
}
