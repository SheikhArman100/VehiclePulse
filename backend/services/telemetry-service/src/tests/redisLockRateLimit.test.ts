import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createLogger } from "@vehicle-pulse/logger";
import {
  RedisClientWrapper,
  SlidingWindowRateLimiter,
  DistributedLock,
} from "@vehicle-pulse/shared";

const testLogger = createLogger({ serviceName: "test-redis-lock-rl", level: "silent" });
const REDIS_TEST_URL = process.env.REDIS_URL || "redis://localhost:6379";

describe("Phase 23 — Redis Rate Limiting, Lua & Distributed Locks Suite", () => {
  let redisWrapper: RedisClientWrapper;
  let limiter: SlidingWindowRateLimiter;
  let lockService: DistributedLock;

  const testLimiterPrefix = "test:rl:";
  const testLockPrefix = "test:lock:";

  before(async () => {
    redisWrapper = new RedisClientWrapper({
      url: REDIS_TEST_URL,
      logger: testLogger,
    });
    const client = redisWrapper.getClient();

    limiter = new SlidingWindowRateLimiter(client, {
      windowMs: 1000, // 1-second window for fast tests
      max: 3, // Max 3 requests per second
      prefix: testLimiterPrefix,
    });

    lockService = new DistributedLock(client, testLogger, {
      ttlMs: 2000,
      prefix: testLockPrefix,
    });

    // Clean up
    await limiter.reset("client_1");
    await client.del(`${testLockPrefix}vehicle_test_1`);
  });

  after(async () => {
    const client = redisWrapper.getClient();
    await limiter.reset("client_1");
    await client.del(`${testLockPrefix}vehicle_test_1`);
    await redisWrapper.disconnect();
  });

  describe("Sliding Window Rate Limiter (Atomic Lua)", () => {
    it("should allow requests within limit and correctly decrement remaining quota", async () => {
      const res1 = await limiter.consume("client_1");
      assert.strictEqual(res1.allowed, true);
      assert.strictEqual(res1.total, 1);
      assert.strictEqual(res1.remaining, 2);

      const res2 = await limiter.consume("client_1");
      assert.strictEqual(res2.allowed, true);
      assert.strictEqual(res2.total, 2);
      assert.strictEqual(res2.remaining, 1);

      const res3 = await limiter.consume("client_1");
      assert.strictEqual(res3.allowed, true);
      assert.strictEqual(res3.total, 3);
      assert.strictEqual(res3.remaining, 0);
    });

    it("should reject requests exceeding maximum allowed requests in the sliding window", async () => {
      const resBlocked = await limiter.consume("client_1");
      assert.strictEqual(resBlocked.allowed, false);
      assert.strictEqual(resBlocked.remaining, 0);
    });

    it("should slide window and replenish quota after window duration elapses", async () => {
      // Wait for window to expire (1000ms + 100ms buffer)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const resReplenished = await limiter.consume("client_1");
      assert.strictEqual(resReplenished.allowed, true);
      assert.strictEqual(resReplenished.total, 1);
      assert.strictEqual(resReplenished.remaining, 2);
    });
  });

  describe("Distributed Lock (Atomic Redlock Mutex)", () => {
    it("should acquire lock on resource and block concurrent attempts on the same resource", async () => {
      const lock1 = await lockService.acquire("vehicle_test_1", { ttlMs: 3000 });
      assert.ok(lock1 !== null, "Lock 1 should be acquired successfully");
      assert.strictEqual(lock1?.resource, "vehicle_test_1");

      // Attempt to acquire lock on the same resource while locked
      const lock2 = await lockService.acquire("vehicle_test_1", { ttlMs: 3000, retryCount: 0 });
      assert.strictEqual(lock2, null, "Concurrent attempt on the same resource must be rejected (null)");

      // Different resource should be acquirable independently
      const lockOther = await lockService.acquire("vehicle_test_2", { ttlMs: 3000 });
      assert.ok(lockOther !== null, "Different resource lock should be acquired independently");

      // Clean up other resource
      if (lockOther) await lockService.release(lockOther);
      if (lock1) await lockService.release(lock1);
    });

    it("should safely release lock only if caller possesses the correct owner token", async () => {
      const lock = await lockService.acquire("vehicle_test_1", { ttlMs: 3000 });
      assert.ok(lock !== null);

      // Impostor tries to release with wrong token
      const impostorLock = {
        ...lock!,
        token: "fake-impostor-token-123",
      };
      const releaseImpostor = await lockService.release(impostorLock);
      assert.strictEqual(releaseImpostor, false, "Impostor token must NOT release the lock");

      // Legitimate owner releases
      const releaseOwner = await lockService.release(lock!);
      assert.strictEqual(releaseOwner, true, "True owner token must successfully release the lock");
    });

    it("should automatically release lock via TTL if process crashes or fails to release", async () => {
      const shortLock = await lockService.acquire("vehicle_test_1", { ttlMs: 500 });
      assert.ok(shortLock !== null);

      // Immediate attempt is blocked
      const immediateAttempt = await lockService.acquire("vehicle_test_1", { retryCount: 0 });
      assert.strictEqual(immediateAttempt, null);

      // Wait for TTL expiry (500ms + 100ms)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Now lock can be acquired again cleanly
      const reAcquired = await lockService.acquire("vehicle_test_1", { ttlMs: 1000 });
      assert.ok(reAcquired !== null, "Lock should be re-acquired after TTL expires");
      if (reAcquired) await lockService.release(reAcquired);
    });
  });
});
