import type { Redis } from "ioredis";
import type { Logger } from "@vehicle-pulse/logger";

export interface CacheOptions {
  ttlSeconds?: number;
  prefix?: string;
}

export class CacheService {
  private redis: Redis;
  private logger: Logger;
  private defaultTtl: number;
  private prefix: string;

  // In-memory hit/miss counters for observability & metrics comparison
  private hits: number = 0;
  private misses: number = 0;

  constructor(redis: Redis, logger: Logger, options: CacheOptions = {}) {
    this.redis = redis;
    this.logger = logger;
    this.defaultTtl = options.ttlSeconds || 300; // 5 minutes default
    this.prefix = options.prefix || "vp:cache:";
  }

  private formatKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Cache-aside pattern:
   * 1. Check Redis for cached value.
   * 2. If present -> return cached value (Hit).
   * 3. If absent -> invoke fetcher, cache result with TTL, and return (Miss).
   */
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const formattedKey = this.formatKey(key);
    const ttl = ttlSeconds ?? this.defaultTtl;

    try {
      const cached = await this.redis.get(formattedKey);
      if (cached !== null) {
        this.hits++;
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      this.logger.warn({ err, key }, "Redis cache GET failed; falling back to source");
    }

    this.misses++;
    const value = await fetcher();

    if (value !== null && value !== undefined) {
      try {
        await this.redis.setex(formattedKey, ttl, JSON.stringify(value));
      } catch (err) {
        this.logger.warn({ err, key }, "Redis cache SETEX failed");
      }
    }

    return value;
  }

  /**
   * Invalidate a single cache key
   */
  public async invalidate(key: string): Promise<void> {
    const formattedKey = this.formatKey(key);
    try {
      await this.redis.del(formattedKey);
    } catch (err) {
      this.logger.error({ err, key }, "Failed to invalidate cache key");
      throw err;
    }
  }

  /**
   * Invalidate keys matching a pattern (e.g. "vehicle:*")
   */
  public async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = this.formatKey(pattern);
    try {
      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return keys.length;
    } catch (err) {
      this.logger.error({ err, pattern }, "Failed to invalidate cache pattern");
      throw err;
    }
  }

  /**
   * Returns current hit/miss statistics for cache monitoring
   */
  public getMetrics(): { hits: number; misses: number; ratio: number } {
    const total = this.hits + this.misses;
    const ratio = total > 0 ? this.hits / total : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      ratio: Math.round(ratio * 1000) / 1000,
    };
  }

  /**
   * Resets metrics counters
   */
  public resetMetrics(): void {
    this.hits = 0;
    this.misses = 0;
  }
}
