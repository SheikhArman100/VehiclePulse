# Kafka Consumer Scaling, Partition Assignment & Historical Replay

**Project:** VehiclePulse — Real-Time Fleet Telemetry Platform  
**Component:** Kafka Consumer Scaling & Replay Engine (`backend/infrastructure/kafka`)  
**Phase:** 28 (Completed)  
**Execution Date:** 2026-11-03

---

## 1. Objective & Architectural Scope

In distributed stream processing, consumer scalability and offset management are fundamental:
1. **Partition-to-Consumer Assignment**: For a topic with $P$ partitions, a consumer group with $C$ consumers distributes partitions evenly. If $C > P$, exactly $C - P$ consumers remain idle in hot-standby.
2. **Rebalancing Behavior**: As instances join or fail, Kafka's group coordinator triggers group rebalances, revoking and reallocating partition leases.
3. **Controlled Historical Replay**: Backfilling historical events or testing new analytical pipelines must be strictly isolated to dedicated replay consumer groups with offset rewinds, guaranteeing zero corruption to live operational pipelines.

---

## 2. Topic Partition Strategy (`vehicle.telemetry.raw`)

- **Topic**: `vehicle.telemetry.raw`
- **Partitions**: 3 (Partitions 0, 1, 2)
- **Partition Key**: `vehicleId`
  - Guarantees strict per-vehicle chronological order (FIFO).
  - Distributes fleet vehicles uniformly across partitions using default murmur2 hashing.

---

## 3. Consumer Scaling & Dynamic Rebalancing Verification

Using the scaling harness CLI (`backend/infrastructure/kafka/src/consumerScaling.ts`):
```bash
node backend/infrastructure/kafka/dist/src/cli.js scale-test 3
```

### Observed Runtime Behavior:
1. **Worker 1 Joins**: Group leader assignment takes ownership of all 3 partitions (`[0, 1, 2]`).
2. **Worker 2 Joins**: Heartbeat coordinator triggers rebalance. Partitions reallocated:
   - `consumer-worker-1`: Assigned partition `[2]`
   - `consumer-worker-2`: Assigned partitions `[0, 1]`
3. **Worker 3 Joins**: Rebalance triggers 1:1 partition allocation:
   - `consumer-worker-1`: Assigned partition `[0]`
   - `consumer-worker-2`: Assigned partition `[1]`
   - `consumer-worker-3`: Assigned partition `[2]`
4. **Graceful Disconnection**: Each consumer unregisters via clean disconnect (`[Consumer] Stopped`), cleanly revoking assignments without unhandled broker socket timeouts.

---

## 4. Controlled Historical Replay & Idempotency Evidence

Historical replay was executed using `backend/infrastructure/kafka/src/consumerReplay.ts`:
```bash
node backend/infrastructure/kafka/dist/src/cli.js replay
```

### Replay Execution Results:
```json
{
  "replayGroupId": "historical-backfill-group-1793694837060",
  "topic": "vehicle.telemetry.raw",
  "messagesReplayed": 50,
  "durationMs": 24,
  "idempotentSafe": true
}
```

### Safety & Isolation Guarantees:
1. **Dedicated Consumer Group**: Replay uses a dynamically scoped group (`historical-backfill-group-<timestamp>`), ensuring committed offsets of live production services (`analytics-consumer-group`, `alert-service-group`, `telemetry-redis-state-group`) remain completely undisturbed.
2. **Offset Rewind**: Admin client executes `admin.resetOffsets({ earliest: true })`.
3. **Idempotency Protection**: Because analytics rollups (Hourly/Daily vehicle stats) and MySQL alert incidents implement deterministic unique constraint deduplication, historical replays can be re-run indefinitely without duplicating metrics or triggering phantom alerts.

---

## 5. Consumer Group Administration Reference

Useful operational commands:
```bash
# List all active consumer groups on cluster
node backend/infrastructure/kafka/dist/src/cli.js groups

# Inspect topic partitions and leader replicas
node backend/infrastructure/kafka/dist/src/cli.js list

# Run multi-consumer scaling drill (e.g. 3 workers)
node backend/infrastructure/kafka/dist/src/cli.js scale-test 3

# Execute isolated historical replay
node backend/infrastructure/kafka/dist/src/cli.js replay
```

