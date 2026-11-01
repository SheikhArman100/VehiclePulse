import type { Request, Response, NextFunction } from "express";
import type { Redis } from "ioredis";
import { AppError } from "./errors.js";

export interface RateLimiterOptions {
  windowMs: number; // Duration of the sliding window in milliseconds (e.g. 60000 = 1 minute)
  max: number; // Maximum allowed requests within the window
  keyGenerator?: (req: Request) => string; // Function to derive the unique client key (default: IP)
  prefix?: string; // Redis key prefix
}

export interface RateLimitInfo {
  allowed: boolean;
  total: number;
  remaining: number;
  resetMs: number;
}

/**
 * Sliding Window Rate Limiter using Redis Sorted Sets (ZSET) & Atomic Lua
 *
 * Lua Script parameters:
 *   KEYS[1] -> Rate limit key (e.g. 'rl:ip:127.0.0.1')
 *   ARGV[1] -> Current timestamp in milliseconds (now)
 *   ARGV[2] -> Window start timestamp (now - windowMs)
 *   ARGV[3] -> Max allowed requests
 *   ARGV[4] -> Window size in seconds (for EXPIRE)
 *
 * Script logic:
 *   1. Remove all records older than window start: ZREMRANGEBYSCORE key -inf windowStart
 *   2. Count remaining records in current window: ZCARD key
 *   3. If count < max:
 *        Add current request: ZADD key now now
 *        Set expiry: EXPIRE key windowSeconds
 *        Return { 1, count + 1, max - (count + 1) } (Allowed)
 *      Else:
 *        Return { 0, count, 0 } (Blocked)
 */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowStart = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local windowSeconds = tonumber(ARGV[4])
local requestId = ARGV[5]

redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
local currentCount = redis.call('ZCARD', key)

if currentCount < maxRequests then
  redis.call('ZADD', key, now, requestId)
  redis.call('EXPIRE', key, windowSeconds)
  return { 1, currentCount + 1, maxRequests - (currentCount + 1) }
else
  return { 0, currentCount, 0 }
end
`;

export class SlidingWindowRateLimiter {
  private redis: Redis;
  private windowMs: number;
  private max: number;
  private prefix: string;

  constructor(redis: Redis, options: { windowMs: number; max: number; prefix?: string }) {
    this.redis = redis;
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.prefix = options.prefix || "vp:ratelimit:";
  }

  /**
   * Evaluates if a request is allowed under the sliding window rate limit
   */
  public async consume(identifier: string): Promise<RateLimitInfo> {
    const key = `${this.prefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const windowSeconds = Math.ceil(this.windowMs / 1000);
    const requestId = `${now}-${Math.random()}`;

    const result = (await this.redis.eval(
      SLIDING_WINDOW_LUA,
      1,
      key,
      now.toString(),
      windowStart.toString(),
      this.max.toString(),
      windowSeconds.toString(),
      requestId
    )) as [number, number, number];


    const allowed = result[0] === 1;
    const total = result[1];
    const remaining = result[2];

    return {
      allowed,
      total,
      remaining,
      resetMs: this.windowMs,
    };
  }

  /**
   * Resets the rate limit for a specific identifier
   */
  public async reset(identifier: string): Promise<void> {
    const key = `${this.prefix}${identifier}`;
    await this.redis.del(key);
  }
}

/**
 * Express Middleware factory for Redis-backed sliding-window rate limiting
 */
export const createRateLimiterMiddleware = (
  redis: Redis,
  options: RateLimiterOptions
) => {
  const limiter = new SlidingWindowRateLimiter(redis, {
    windowMs: options.windowMs,
    max: options.max,
    prefix: options.prefix,
  });

  const defaultKeyGen = (req: Request) =>
    req.ip || req.socket.remoteAddress || "127.0.0.1";

  const keyGen = options.keyGenerator || defaultKeyGen;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientKey = keyGen(req);
      const limitInfo = await limiter.consume(clientKey);

      // Set standard RateLimit headers (RFC 6585)
      res.setHeader("RateLimit-Limit", options.max);
      res.setHeader("RateLimit-Remaining", limitInfo.remaining);
      res.setHeader("RateLimit-Reset", Math.ceil(options.windowMs / 1000));

      if (!limitInfo.allowed) {
        res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
        throw new AppError(
          `Too many requests. Limit is ${options.max} requests per ${Math.ceil(
            options.windowMs / 1000
          )} seconds.`,
          429
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
