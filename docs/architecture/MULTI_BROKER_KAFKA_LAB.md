# Phase 34 Architecture Report: Multi-Broker Kafka Cluster Lab

## 1. Overview
VehiclePulse executed an isolated **3-Broker KRaft Cluster Lab** to verify distributed quorum consensus, partition replication factors, in-sync replicas (ISR) contraction/expansion, and automatic partition leader re-election under hard broker failure.

- **Topology**: 3 KRaft Nodes (each serving as combined `broker,controller`), Quorum voters: `1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093`.
- **Image**: `apache/kafka:3.8.1` (100% Free Open-Source Apache License).
- **Compose Profile**: `backend/infrastructure/kafka/docker-compose.kafka-cluster.yml`.
- **Ports**:
  - `kafka-1`: `9092`
  - `kafka-2`: `9093`
  - `kafka-3`: `9094`

---

## 2. Cluster Topology & Replication Guarantees

### Topic Configuration
```text
Topic: vehicle.cluster.replicated.telemetry
Partitions: 3
Replication Factor: 3
min.insync.replicas: 2
Producer Acks: -1 (all ISR required)
```

### Initial Healthy State
Before failure, leadership and replicas were evenly balanced across the cluster:
- **Partition 0**: Leader = 2, Replicas = `[2, 3, 1]`, ISR = `[2, 3, 1]`
- **Partition 1**: Leader = 3, Replicas = `[3, 1, 2]`, ISR = `[3, 1, 2]`
- **Partition 2**: Leader = 1, Replicas = `[1, 2, 3]`, ISR = `[1, 2, 3]`

---

## 3. Failure & Recovery Dynamics

### 1. Hard Broker Kill (`vehiclepulse-kafka-3`)
- **Simulated Event**: `docker stop vehiclepulse-kafka-3` (instant kill of broker 3).
- **Partition 1 Leader Re-election**:
  - Previously led by Broker 3.
  - KRaft controller immediately initiated failover: **Broker 1 was elected new Leader for Partition 1**.
- **ISR Contraction**:
  - Active ISR shrunk from `[3, 1, 2]` to `[1, 2]`.
  - Configured replicas remained `[3, 1, 2]`.

### 2. Degraded Write Verification with `acks=-1`
- While Broker 3 was **DEAD**, a test producer sent messages with `acks=-1` (`all`).
- **Result**: The write **SUCCEEDED** because `min.insync.replicas=2` was satisfied by the 2 surviving nodes (Broker 1 and Broker 2).
- Zero data loss was mathematically guaranteed.

### 3. Broker Recovery & ISR Expansion
- **Action**: `docker start vehiclepulse-kafka-3`.
- Broker 3 reconnected to the KRaft cluster, fetched missing offsets from the partition leaders, and caught up with log watermarks.
- **Result**: Controller expanded ISR back to `[2, 1, 3]`, restoring full 3-way fault tolerance.

---

## 4. Hardware Costs & Single-Machine Considerations
Running a 3-broker cluster locally requires allocating 3 distinct JVM heaps (approx. 1.5 GB RAM total). For standard local development, VehiclePulse defaults to the lightweight single-node KRaft broker (`docker-compose.yml`), while providing this dedicated compose profile for replication experiments and certification.

