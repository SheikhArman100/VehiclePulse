import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { createServer, type Server as HttpServer } from "node:http";
import WebSocket from "ws";
import { createLogger } from "@vehicle-pulse/logger";
import { RedisClientWrapper, VehicleStateService, type StoredVehicleState } from "@vehicle-pulse/shared";
import { WebSocketBroadcaster, REDIS_CHANNELS } from "../app/websocket/wsBroadcaster.js";

const testLogger = createLogger({ serviceName: "test-redis-ws", level: "silent" });
const REDIS_TEST_URL = process.env.REDIS_URL || "redis://localhost:6379";

describe("Phase 24 — Redis Pub/Sub & WebSocket Live State Streaming Suite", () => {
  let httpServer: HttpServer;
  let redisWrapper: RedisClientWrapper;
  let stateService: VehicleStateService;
  let wsBroadcaster: WebSocketBroadcaster;
  let port: number;

  before(async () => {
    httpServer = createServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        if (typeof addr === "object" && addr) {
          port = addr.port;
        }
        resolve();
      });
    });

    redisWrapper = new RedisClientWrapper({
      url: REDIS_TEST_URL,
      logger: testLogger,
    });
    const redisClient = redisWrapper.getClient();
    stateService = new VehicleStateService(redisClient, testLogger, {
      ttlSeconds: 60,
    });

    const redisSub = redisClient.duplicate();
    wsBroadcaster = new WebSocketBroadcaster({
      server: httpServer,
      redisSub,
      stateService,
      logger: testLogger,
      path: "/ws",
      heartbeatIntervalMs: 500, // Fast heartbeat for tests
    });
  });

  after(async () => {
    await wsBroadcaster.close();
    await redisWrapper.disconnect();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it("should connect to WebSocket server, receive connection confirmation, and reply to ping", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

    const connectedMsg = await new Promise<any>((resolve, reject) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "CONNECTED") {
          resolve(msg);
        }
      });
      ws.on("error", reject);
    });

    assert.strictEqual(connectedMsg.type, "CONNECTED");
    assert.strictEqual(wsBroadcaster.getConnectedClientCount(), 1);

    ws.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it("should broadcast real-time state updates to connected clients via Redis Pub/Sub", async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

    await new Promise<void>((resolve) => {
      ws.on("open", () => resolve());
    });

    const receivedPromise = new Promise<any>((resolve) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "STATE_UPDATE" && msg.vehicleId === "veh_pubsub_test") {
          resolve(msg);
        }
      });
    });

    // Simulate Redis Pub/Sub publish
    const sampleState: StoredVehicleState = {
      vehicleId: "veh_pubsub_test",
      status: "ONLINE",
      isOnline: true,
      lastSeen: new Date().toISOString(),
      lastUpdatedTimestamp: Date.now(),
      activeAlertCount: 0,
      latestTelemetry: {
        location: { latitude: 23.8103, longitude: 90.4125, heading: 90 },
        speed: 75.5,
        rpm: 2500,
        fuelLevelPercent: 88,
        engineTemperatureCelsius: 90,
        batteryVoltage: 12.6,
        odometerKm: 12500,
        engineStatus: "ON",
      },
    };

    const redisPub = redisWrapper.getClient();
    await redisPub.publish(REDIS_CHANNELS.STATE_UPDATES, JSON.stringify(sampleState));

    const received = await receivedPromise;
    assert.strictEqual(received.type, "STATE_UPDATE");
    assert.strictEqual(received.vehicleId, "veh_pubsub_test");
    assert.strictEqual(received.data.latestTelemetry.speed, 75.5);

    ws.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it("should return an instant snapshot of vehicle state upon SUBSCRIBE command or reconnect", async () => {
    // 1. Seed state in Redis
    const seedEvent: any = {
      eventId: "evt-snap-1",
      eventType: "telemetry.raw",
      version: "1.0.0",
      vehicleId: "veh_snapshot_1",
      deviceId: "obd_1",
      timestamp: new Date().toISOString(),
      data: {
        location: { latitude: 23.75, longitude: 90.38, heading: 180 },
        speed: 42,
        rpm: 1800,
        fuelLevelPercent: 65,
        engineTemperatureCelsius: 85,
        batteryVoltage: 12.4,
        odometerKm: 3400,
        engineStatus: "ON",
      },
    };
    await stateService.updateFromTelemetry(seedEvent);

    // 2. Client connects and requests SNAPSHOT
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

    await new Promise<void>((resolve) => {
      ws.on("open", () => {
        ws.send(JSON.stringify({ type: "SUBSCRIBE", vehicleId: "veh_snapshot_1" }));
        resolve();
      });
    });

    const snapshotMsg = await new Promise<any>((resolve) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "SNAPSHOT" && msg.vehicleId === "veh_snapshot_1") {
          resolve(msg);
        }
      });
    });

    assert.strictEqual(snapshotMsg.type, "SNAPSHOT");
    assert.strictEqual(snapshotMsg.vehicleId, "veh_snapshot_1");
    assert.strictEqual(snapshotMsg.data.latestTelemetry.speed, 42);

    ws.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
