import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "node:http";
import type { Redis } from "ioredis";
import type { Logger } from "@vehicle-pulse/logger";
import { VehicleStateService, type StoredVehicleState } from "@vehicle-pulse/shared";

export const REDIS_CHANNELS = {
  STATE_UPDATES: "vehicle:events:state-updates",
} as const;

export interface WebSocketBroadcasterOptions {
  server: HttpServer;
  redisSub: Redis; // Dedicated Redis client for SUBSCRIBE
  stateService: VehicleStateService;
  logger: Logger;
  path?: string; // default: /ws
  heartbeatIntervalMs?: number; // default: 30000ms
}

interface ClientMeta {
  isAlive: boolean;
  subscriptions: Set<string>; // empty set means subscribe to all vehicles
}

export class WebSocketBroadcaster {
  private wss: WebSocketServer;
  private redisSub: Redis;
  private stateService: VehicleStateService;
  private logger: Logger;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private clientMetaMap = new Map<WebSocket, ClientMeta>();

  constructor(options: WebSocketBroadcasterOptions) {
    this.redisSub = options.redisSub;
    this.stateService = options.stateService;
    this.logger = options.logger;

    const path = options.path || "/ws";
    this.wss = new WebSocketServer({
      server: options.server,
      path,
      // Maximum message size: 64 KB (prevents unbounded memory consumption)
      maxPayload: 64 * 1024,
    });

    this.setupWebSocketServer();
    this.setupRedisSubscriber();
    this.setupHeartbeat(options.heartbeatIntervalMs || 30000);

    this.logger.info({ path }, "WebSocket broadcaster initialized and listening for connections");
  }

  private setupWebSocketServer(): void {
    this.wss.on("connection", async (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress;
      this.logger.info({ clientIp }, "New WebSocket client connected");

      // Initialize client metadata
      const meta: ClientMeta = {
        isAlive: true,
        subscriptions: new Set(),
      };
      this.clientMetaMap.set(ws, meta);

      // Handle pong responses to heartbeats
      ws.on("pong", () => {
        const m = this.clientMetaMap.get(ws);
        if (m) m.isAlive = true;
      });

      // Handle incoming messages from browser (e.g. subscribe to specific vehicle, or request initial snapshot)
      ws.on("message", async (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(ws, message);
        } catch (err) {
          this.logger.warn({ err }, "Invalid JSON received from WebSocket client");
          ws.send(JSON.stringify({ type: "ERROR", message: "Invalid JSON message" }));
        }
      });

      ws.on("close", (code, reason) => {
        this.clientMetaMap.delete(ws);
        this.logger.info({ clientIp, code, reason: reason.toString() }, "WebSocket client disconnected");
      });

      ws.on("error", (err) => {
        this.logger.error({ err, clientIp }, "WebSocket client socket error");
        this.clientMetaMap.delete(ws);
        ws.terminate();
      });

      // Send connection confirmation & snapshot instruction
      ws.send(
        JSON.stringify({
          type: "CONNECTED",
          message: "Connected to VehiclePulse Live State Stream",
          timestamp: new Date().toISOString(),
        })
      );
    });
  }

  /**
   * Handles client commands (snapshot request, vehicle filters)
   */
  private async handleClientMessage(ws: WebSocket, message: any): Promise<void> {
    const meta = this.clientMetaMap.get(ws);
    if (!meta) return;

    switch (message.type) {
      case "SUBSCRIBE": {
        // message.vehicleId: subscribe to specific vehicle
        if (message.vehicleId && typeof message.vehicleId === "string") {
          meta.subscriptions.add(message.vehicleId);
          // Return instant snapshot for this vehicle on subscription
          const snapshot = await this.stateService.getVehicleState(message.vehicleId);
          ws.send(
            JSON.stringify({
              type: "SNAPSHOT",
              vehicleId: message.vehicleId,
              data: snapshot,
            })
          );
        }
        break;
      }

      case "UNSUBSCRIBE": {
        if (message.vehicleId) {
          meta.subscriptions.delete(message.vehicleId);
        }
        break;
      }

      case "SNAPSHOT": {
        // Client requested a snapshot of a vehicle after a reconnect
        if (message.vehicleId) {
          const snapshot = await this.stateService.getVehicleState(message.vehicleId);
          ws.send(
            JSON.stringify({
              type: "SNAPSHOT",
              vehicleId: message.vehicleId,
              data: snapshot,
            })
          );
        }
        break;
      }

      default:
        ws.send(JSON.stringify({ type: "ACK", received: message.type }));
    }
  }

  /**
   * Listens to Redis Pub/Sub channel for live state updates
   */
  private setupRedisSubscriber(): void {
    this.redisSub.subscribe(REDIS_CHANNELS.STATE_UPDATES, (err) => {
      if (err) {
        this.logger.error({ err }, "Failed to subscribe to Redis state updates channel");
      } else {
        this.logger.info(
          { channel: REDIS_CHANNELS.STATE_UPDATES },
          "Subscribed to Redis Pub/Sub state updates channel"
        );
      }
    });

    this.redisSub.on("message", (channel, rawMessage) => {
      if (channel !== REDIS_CHANNELS.STATE_UPDATES) return;

      try {
        const update = JSON.parse(rawMessage) as StoredVehicleState;
        this.broadcastStateUpdate(update);
      } catch (err) {
        this.logger.error({ err }, "Error parsing Pub/Sub message for broadcast");
      }
    });
  }

  /**
   * Broadcasts a state update to connected clients with subscription filtering & backpressure protection
   */
  public broadcastStateUpdate(state: StoredVehicleState): void {
    const payload = JSON.stringify({
      type: "STATE_UPDATE",
      vehicleId: state.vehicleId,
      data: state,
    });

    for (const [ws, meta] of this.clientMetaMap.entries()) {
      if (ws.readyState !== WebSocket.OPEN) {
        continue;
      }

      // Backpressure protection: skip slow clients with bufferedAmount > 64 KB
      if (ws.bufferedAmount > 64 * 1024) {
        this.logger.warn(
          { bufferedAmount: ws.bufferedAmount },
          "Dropping frame for slow WebSocket client to prevent memory leak"
        );
        continue;
      }

      // Check if client subscribed to all or this specific vehicle
      if (meta.subscriptions.size === 0 || meta.subscriptions.has(state.vehicleId)) {
        ws.send(payload);
      }
    }
  }

  /**
   * Heartbeat detector: pings clients periodically and terminates dead connections
   */
  private setupHeartbeat(intervalMs: number): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [ws, meta] of this.clientMetaMap.entries()) {
        if (!meta.isAlive) {
          this.logger.info("Terminating unresponsive WebSocket client (heartbeat failed)");
          this.clientMetaMap.delete(ws);
          ws.terminate();
          continue;
        }

        meta.isAlive = false;
        ws.ping();
      }
    }, intervalMs);
  }

  /**
   * Closes the WebSocket server, heartbeat, and subscriber cleanly
   */
  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const ws of this.clientMetaMap.keys()) {
      ws.terminate();
    }
    this.clientMetaMap.clear();

    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve());
    });

    try {
      this.redisSub.disconnect();
    } catch {
      // ignore
    }

    this.logger.info("WebSocket broadcaster closed cleanly");
  }

  public getConnectedClientCount(): number {
    return this.clientMetaMap.size;
  }
}
