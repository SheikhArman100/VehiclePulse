import type { Redis } from "ioredis";
import type { TelemetryRawEvent, VehicleStateData } from "@vehicle-pulse/event-contracts";
import type { Logger } from "@vehicle-pulse/logger";

export interface StoredVehicleState extends VehicleStateData {
  vehicleId: string;
  deviceId?: string;
  lastUpdatedTimestamp: number; // Unix epoch ms for out-of-order comparison
  isOnline: boolean;
}

export interface StateServiceOptions {
  ttlSeconds?: number; // Default TTL for state key (e.g., 86400 = 24h)
  offlineThresholdSeconds?: number; // Time without telemetry before vehicle marked OFFLINE (e.g. 60s)
}

/**
 * Lua Script for Atomic Stale-Update Protected State Writes
 * Keys:
 *   KEYS[1] -> 'vehicle:<vehicleId>:state'
 * Arguments:
 *   ARGV[1] -> Incoming event timestamp (unix epoch ms string)
 *   ARGV[2] -> Serialized JSON payload
 *   ARGV[3] -> Key TTL in seconds
 *
 * Logic:
 *   1. Check existing state's lastUpdatedTimestamp.
 *   2. If existing timestamp > incoming timestamp: Reject update (return 0).
 *   3. Otherwise: Save new payload, update TTL, and return 1.
 */
const ATOMIC_UPDATE_STATE_LUA = `
local currentState = redis.call('GET', KEYS[1])
if currentState then
  local decoded = cjson.decode(currentState)
  if decoded and decoded.lastUpdatedTimestamp then
    if tonumber(decoded.lastUpdatedTimestamp) > tonumber(ARGV[1]) then
      return 0
    end
  end
end
redis.call('SETEX', KEYS[1], tonumber(ARGV[3]), ARGV[2])
return 1
`;

export class VehicleStateService {
  private readonly ttlSeconds: number;
  private readonly offlineThresholdSeconds: number;

  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
    options: StateServiceOptions = {}
  ) {
    this.ttlSeconds = options.ttlSeconds ?? 86400; // 24 hours
    this.offlineThresholdSeconds = options.offlineThresholdSeconds ?? 60; // 60 seconds
  }

  public getVehicleStateKey(vehicleId: string): string {
    return `vehicle:${vehicleId}:state`;
  }

  /**
   * Updates vehicle real-time state with atomic out-of-order protection.
   * Returns true if state was updated, false if discarded as a stale event.
   */
  public async updateFromTelemetry(event: TelemetryRawEvent): Promise<boolean> {
    const key = this.getVehicleStateKey(event.vehicleId);
    const eventTimeMs = new Date(event.timestamp).getTime();

    const statePayload: StoredVehicleState = {
      vehicleId: event.vehicleId,
      deviceId: event.deviceId,
      status: "ONLINE",
      isOnline: true,
      lastSeen: event.timestamp,
      lastUpdatedTimestamp: eventTimeMs,
      latestTelemetry: event.data,
      activeAlertCount: 0,
    };

    const serialized = JSON.stringify(statePayload);

    try {
      const result = await this.redis.eval(
        ATOMIC_UPDATE_STATE_LUA,
        1,
        key,
        eventTimeMs.toString(),
        serialized,
        this.ttlSeconds.toString()
      );

      const applied = result === 1;
      if (applied) {
        this.logger.debug(
          { vehicleId: event.vehicleId, timestamp: event.timestamp },
          "Vehicle real-time state updated in Redis"
        );
      } else {
        this.logger.warn(
          { vehicleId: event.vehicleId, timestamp: event.timestamp },
          "Discarded stale/out-of-order telemetry update in Redis"
        );
      }
      return applied;
    } catch (err) {
      this.logger.error({ err, vehicleId: event.vehicleId }, "Failed to update vehicle state in Redis");
      throw err;
    }
  }

  /**
   * Retrieves latest vehicle state, computing online/offline dynamically
   * based on lastSeen and offlineThresholdSeconds.
   */
  public async getVehicleState(vehicleId: string): Promise<StoredVehicleState | null> {
    const key = this.getVehicleStateKey(vehicleId);
    try {
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }

      const state: StoredVehicleState = JSON.parse(data);
      const nowMs = Date.now();
      const lastSeenMs = new Date(state.lastSeen).getTime();
      const diffSeconds = (nowMs - lastSeenMs) / 1000;

      // Dynamically evaluate staleness / online status
      if (diffSeconds > this.offlineThresholdSeconds) {
        state.status = "OFFLINE";
        state.isOnline = false;
      } else {
        state.status = "ONLINE";
        state.isOnline = true;
      }

      return state;
    } catch (err) {
      this.logger.error({ err, vehicleId }, "Error retrieving vehicle state from Redis");
      throw err;
    }
  }

  /**
   * Batch retrieves states for multiple vehicles
   */
  public async getMultipleVehicleStates(vehicleIds: string[]): Promise<Record<string, StoredVehicleState | null>> {
    if (vehicleIds.length === 0) return {};

    const keys = vehicleIds.map((id) => this.getVehicleStateKey(id));
    const results = await this.redis.mget(...keys);

    const states: Record<string, StoredVehicleState | null> = {};
    const nowMs = Date.now();

    vehicleIds.forEach((id, index) => {
      const raw = results[index];
      if (!raw) {
        states[id] = null;
        return;
      }

      try {
        const state: StoredVehicleState = JSON.parse(raw);
        const diffSeconds = (nowMs - new Date(state.lastSeen).getTime()) / 1000;
        if (diffSeconds > this.offlineThresholdSeconds) {
          state.status = "OFFLINE";
          state.isOnline = false;
        } else {
          state.status = "ONLINE";
          state.isOnline = true;
        }
        states[id] = state;
      } catch {
        states[id] = null;
      }
    });

    return states;
  }
}
