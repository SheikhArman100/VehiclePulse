# Kafka Topic Strategy & Cluster Architecture

## 1. Overview
Kafka serves as the core event streaming backbone for **VehiclePulse**. It decouples high-throughput ingest gateways (HTTP/gRPC/MQTT) from downstream analytical aggregators, anomaly detectors, and real-time state distributors.

This document details the topic design, partition strategy, retention semantics, and verified guarantees for both local development and production environments.

---

## 2. Topic Catalog & Specifications

| Topic Name | Purpose | Partitions | Replication (Local / Prod) | Cleanup Policy | Retention | Partition Key |
|---|---|---|---|---|---|---|
| `vehicle.telemetry.raw` | Ingested raw telemetry points from IoT trackers | 3 (Local) / 12+ (Prod) | 1 / 3 | `delete` | 3 Days (`259200000ms`) | `vehicleId` |
| `vehicle.telemetry.processed` | Enriched/validated telemetry events | 3 (Local) / 12+ (Prod) | 1 / 3 | `delete` | 7 Days (`604800000ms`) | `vehicleId` |
| `vehicle.alerts` | Anomaly & rule breach alerts (speed, geo, brake) | 3 (Local) / 6+ (Prod) | 1 / 3 | `delete` | 14 Days (`1209600000ms`) | `vehicleId` |
| `vehicle.state` | Latest known vehicle state snapshot | 3 (Local) / 6+ (Prod) | 1 / 3 | `compact` | Indefinite (min dirty 0.1) | `vehicleId` |
| `vehicle.commands` | Downlink commands sent to vehicle trackers | 3 (Local) / 6+ (Prod) | 1 / 3 | `delete` | 7 Days (`604800000ms`) | `vehicleId` |

---

## 3. Partitioning & Message Ordering Guarantees

### Keying by `vehicleId`
All telemetry events, state updates, and alerts published to Kafka **MUST** use `vehicleId` as the record key (`message.key`).

#### Guarantees Provided:
1. **Per-Vehicle Strict Total Ordering:**
   - Kafka guarantees that all records with the same partition key land on the exact same partition.
   - Therefore, telemetry timestamps and kinematic progression for vehicle `veh_100` are guaranteed to arrive in order at downstream consumers.
2. **Horizontal Consumer Group Scaling:**
   - With 3 partitions locally (and more in production), multiple consumer instances (e.g., in `analytics-service` or `alert-service`) can process distinct subsets of the vehicle fleet concurrently without concurrency collisions or race conditions.

---

## 4. Log Compaction Strategy (`vehicle.state`)

The `vehicle.state` topic uses `cleanup.policy=compact`:
- Instead of deleting records older than a TTL, Kafka periodically sweeps partitions and retains only the latest value for each `vehicleId`.
- **Cold Boot Recovery:** When a new WebSocket gateway or caching worker starts up, it can replay `vehicle.state` from offset `0` to immediately reconstruct the entire fleet's current location and status without querying databases.

---

## 5. Local Single-Broker KRaft Limitations

For local development on Docker Compose:
- **Broker Mode:** Apache Kafka 3.8.1 running in **KRaft** (Kafka Raft metadata mode, no ZooKeeper dependency).
- **Cluster Topology:** Single node (`vehiclepulse-kafka`) acting as both broker and controller (`KAFKA_PROCESS_ROLES: "broker,controller"`).
- **Replication Factor:** Set to `1`.
- **Limitation Warning:**
  - ⚠ There is **NO High Availability (HA)** or automated failover in the local setup.
  - If the single container stops or its volume is wiped, in-flight messages are unavailable until restarted.
  - In Phase 34, a multi-broker 3-node cluster profile (`docker-compose.kafka-cluster.yml`) is provided for leader election and failover testing.

---

## 6. Administration & Inspection Tooling

An administrative package is provided in `backend/infrastructure/kafka`:

```bash
# Provision all canonical topics with exact partition counts and retention
npm run topics:create --workspace=@vehicle-pulse/kafka-admin

# Inspect topic metadata and partitions
npm run topics:list --workspace=@vehicle-pulse/kafka-admin

# List active consumer groups
npm run groups:list --workspace=@vehicle-pulse/kafka-admin

# Run live event exchange verification (Producer -> Consumer with keying)
npm run test:exchange --workspace=@vehicle-pulse/kafka-admin
```

Direct container verification:
```bash
docker exec vehiclepulse-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --describe
```
