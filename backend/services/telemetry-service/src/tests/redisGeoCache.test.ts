import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createLogger } from "@vehicle-pulse/logger";
import { RedisClientWrapper, VehicleGeoService, CacheService } from "@vehicle-pulse/shared";

const testLogger = createLogger({ serviceName: "test-redis-geo", level: "silent" });
const REDIS_TEST_URL = process.env.REDIS_URL || "redis://localhost:6379";

describe("Phase 22 — Redis Caching & GEO Proximity Search Suite", () => {
  let redisWrapper: RedisClientWrapper;
  let geoService: VehicleGeoService;
  let cacheService: CacheService;

  const testGeoKey = "test:fleet:locations:geo";

  before(async () => {
    redisWrapper = new RedisClientWrapper({
      url: REDIS_TEST_URL,
      logger: testLogger,
    });
    const client = redisWrapper.getClient();
    geoService = new VehicleGeoService(client, testLogger, { key: testGeoKey });
    cacheService = new CacheService(client, testLogger, {
      ttlSeconds: 10,
      prefix: "test:cache:",
    });

    // Clean up test keys
    await client.del(testGeoKey);
    await cacheService.invalidatePattern("test:*");
  });

  after(async () => {
    const client = redisWrapper.getClient();
    await client.del(testGeoKey);
    await cacheService.invalidatePattern("test:*");
    await redisWrapper.disconnect();
  });

  it("should index vehicle coordinates using GEOADD and find them within radius using GEOSEARCH", async () => {
    // Dhaka center: 90.4125, 23.8103
    // Vehicle 1: 500m away (90.4150, 23.8120)
    // Vehicle 2: 1.5km away (90.4250, 23.8150)
    // Vehicle 3: 50km away in Chittagong (91.8364, 22.3569)
    await geoService.updateLocation("veh_nearby_1", 90.415, 23.812);
    await geoService.updateLocation("veh_nearby_2", 90.425, 23.815);
    await geoService.updateLocation("veh_far_away", 91.8364, 22.3569);

    const count = await geoService.getIndexedCount();
    assert.strictEqual(count, 3, "Should have 3 vehicles indexed in GEO set");

    // Search 5km radius from Dhaka center
    const results5km = await geoService.findNearby(90.4125, 23.8103, 5, 10);
    assert.strictEqual(results5km.length, 2, "Should only find the 2 vehicles within 5km");

    // Results should be ordered by distance ascending
    assert.strictEqual(results5km[0].vehicleId, "veh_nearby_1");
    assert.ok(results5km[0].distanceKm < 1.0, `Vehicle 1 distance ${results5km[0].distanceKm}km should be < 1.0km`);
    assert.strictEqual(results5km[1].vehicleId, "veh_nearby_2");
    assert.ok(results5km[1].distanceKm > results5km[0].distanceKm, "Should be sorted ascending by distance");

    // Search 100km radius (includes Chittagong vehicle)
    const results100km = await geoService.findNearby(90.4125, 23.8103, 300, 10);
    assert.strictEqual(results100km.length, 3, "Should find all 3 vehicles within 300km");
  });

  it("should remove vehicle from geospatial index when decommissioned or removed", async () => {
    await geoService.removeLocation("veh_far_away");

    const results = await geoService.findNearby(90.4125, 23.8103, 300, 10);
    assert.strictEqual(results.length, 2, "Should only have 2 vehicles after deletion");
    const ids = results.map((r) => r.vehicleId);
    assert.ok(!ids.includes("veh_far_away"), "Removed vehicle should not appear in search results");
  });

  it("should execute Cache-Aside pattern, verify Cache Hit vs Miss latency, and track metrics", async () => {
    cacheService.resetMetrics();

    let dbCallCount = 0;
    const mockDbFetcher = async () => {
      dbCallCount++;
      // Simulate 15ms database query latency
      await new Promise((res) => setTimeout(res, 15));
      return { vehicleId: "veh_cached_1", model: "Tesla Cybertruck", year: 2026 };
    };

    // 1. First Call: Cache MISS
    const startMiss = performance.now();
    const result1 = await cacheService.getOrSet("veh_cached_1", mockDbFetcher, 30);
    const durationMissMs = performance.now() - startMiss;

    assert.strictEqual(dbCallCount, 1, "Fetcher should be called on cache miss");
    assert.strictEqual(result1.model, "Tesla Cybertruck");
    assert.ok(durationMissMs >= 14, `Cache miss should take >=14ms, took ${durationMissMs}ms`);

    // 2. Second Call: Cache HIT (Sub-millisecond)
    const startHit = performance.now();
    const result2 = await cacheService.getOrSet("veh_cached_1", mockDbFetcher, 30);
    const durationHitMs = performance.now() - startHit;

    assert.strictEqual(dbCallCount, 1, "Fetcher should NOT be called on cache hit");
    assert.strictEqual(result2.model, "Tesla Cybertruck");
    assert.ok(durationHitMs < 5, `Cache hit should be fast (<5ms), took ${durationHitMs}ms`);

    // 3. Verify Metrics
    const metrics = cacheService.getMetrics();
    assert.strictEqual(metrics.misses, 1);
    assert.strictEqual(metrics.hits, 1);
    assert.strictEqual(metrics.ratio, 0.5);
  });

  it("should invalidate cached entry upon write or deletion", async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { status: "ACTIVE" };
    };

    await cacheService.getOrSet("key_to_invalidate", fetcher);
    assert.strictEqual(fetchCount, 1);

    // Invalidate
    await cacheService.invalidate("key_to_invalidate");

    // Fetch again -> Must trigger fetcher again (Cache Miss)
    await cacheService.getOrSet("key_to_invalidate", fetcher);
    assert.strictEqual(fetchCount, 2, "Fetcher should be invoked after cache invalidation");
  });
});
