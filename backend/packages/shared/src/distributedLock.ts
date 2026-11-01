import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import type { Logger } from "@vehicle-pulse/logger";

export interface LockOptions {
  ttlMs?: number; // How long before the lock automatically expires (default: 5000ms)
  retryCount?: number; // Number of times to retry acquiring lock (default: 0)
  retryDelayMs?: number; // Delay between retries in milliseconds (default: 100ms)
  prefix?: string;
}

export interface LockHandle {
  resource: string;
  token: string;
  key: string;
  acquiredAt: number;
  ttlMs: number;
}

/**
 * Atomic Lua script to release lock safely:
 * Only deletes the key if the current value matches the owner's token.
 * Prevents releasing a lock that expired and was acquired by another process.
 *
 * KEYS[1] -> Lock key
 * ARGV[1] -> Owner token
 */
const SAFE_RELEASE_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Distributed Lock primitive (Redlock single-instance mutex)
 * Ensures only one process can execute work on a specific resource at a time.
 */
export class DistributedLock {
  private redis: Redis;
  private logger: Logger;
  private defaultTtlMs: number;
  private prefix: string;

  constructor(redis: Redis, logger: Logger, options: LockOptions = {}) {
    this.redis = redis;
    this.logger = logger;
    this.defaultTtlMs = options.ttlMs || 5000;
    this.prefix = options.prefix || "vp:lock:";
  }

  private getKey(resource: string): string {
    return `${this.prefix}${resource}`;
  }

  /**
   * Acquires a lock on a resource.
   * Returns a LockHandle if acquired, or null if already locked.
   */
  public async acquire(
    resource: string,
    options: { ttlMs?: number; retryCount?: number; retryDelayMs?: number } = {}
  ): Promise<LockHandle | null> {
    const key = this.getKey(resource);
    const token = randomUUID();
    const ttlMs = options.ttlMs || this.defaultTtlMs;
    const retryCount = options.retryCount ?? 0;
    const retryDelayMs = options.retryDelayMs ?? 100;

    let attempts = 0;
    while (attempts <= retryCount) {
      // SET resource token NX PX ttlMs
      const result = await this.redis.set(key, token, "PX", ttlMs, "NX");
      if (result === "OK") {
        return {
          resource,
          token,
          key,
          acquiredAt: Date.now(),
          ttlMs,
        };
      }

      attempts++;
      if (attempts <= retryCount) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    return null;
  }

  /**
   * Releases a lock using the atomic Lua script.
   * Returns true if released by the owner, or false if lock already expired or owned by someone else.
   */
  public async release(lock: LockHandle): Promise<boolean> {
    try {
      const result = (await this.redis.eval(
        SAFE_RELEASE_LUA,
        1,
        lock.key,
        lock.token
      )) as number;
      return result === 1;
    } catch (err) {
      this.logger.error({ err, resource: lock.resource }, "Error safely releasing distributed lock");
      return false;
    }
  }

  /**
   * Executes a task wrapped inside a distributed lock.
   * Automatically acquires and safely releases the lock.
   */
  public async withLock<T>(
    resource: string,
    task: () => Promise<T>,
    options: { ttlMs?: number; retryCount?: number; retryDelayMs?: number } = {}
  ): Promise<T> {
    const lock = await this.acquire(resource, options);
    if (!lock) {
      throw new Error(`Resource '${resource}' is currently locked by another concurrent process.`);
    }

    try {
      return await task();
    } finally {
      await this.release(lock);
    }
  }
}
