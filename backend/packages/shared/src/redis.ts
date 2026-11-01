import { Redis, type RedisOptions } from "ioredis";
import type { Logger } from "@vehicle-pulse/logger";

export interface RedisConfig {
  url: string;
  logger: Logger;
  keyPrefix?: string;
  connectTimeout?: number;
  maxRetriesPerRequest?: number;
}

export class RedisClientWrapper {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor(private readonly config: RedisConfig) {}

  public getClient(): Redis {
    if (this.redis) {
      return this.redis;
    }

    const options: RedisOptions = {
      maxRetriesPerRequest: this.config.maxRetriesPerRequest ?? 3,
      connectTimeout: this.config.connectTimeout ?? 10000,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 3000);
        this.config.logger.warn({ attempt: times, delay }, "Reconnecting to Redis...");
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const targetErrors = ["READONLY", "ETIMEDOUT", "ECONNRESET"];
        if (targetErrors.some((target) => err.message.includes(target))) {
          return true; // Reconnect automatically
        }
        return false;
      },
    };

    if (this.config.keyPrefix) {
      options.keyPrefix = this.config.keyPrefix;
    }

    this.redis = new Redis(this.config.url, options);

    this.redis.on("connect", () => {
      this.isConnected = true;
      this.config.logger.info("Connected to Redis server");
    });

    this.redis.on("ready", () => {
      this.config.logger.info("Redis client ready for commands");
    });

    this.redis.on("error", (err) => {
      this.config.logger.error({ err }, "Redis client error encountered");
    });

    this.redis.on("close", () => {
      this.isConnected = false;
      this.config.logger.warn("Redis connection closed");
    });

    return this.redis;
  }

  public async ping(): Promise<boolean> {
    try {
      const client = this.getClient();
      const res = await client.ping();
      return res === "PONG";
    } catch {
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.redis) {
      this.config.logger.info("Disconnecting Redis client...");
      await this.redis.quit().catch(() => this.redis?.disconnect());
      this.redis = null;
      this.isConnected = false;
      this.config.logger.info("Redis client disconnected");
    }
  }

  public get connected(): boolean {
    return this.isConnected;
  }
}
