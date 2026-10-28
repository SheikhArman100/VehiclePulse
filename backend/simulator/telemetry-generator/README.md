# VehiclePulse Stateful Telemetry Simulator CLI

## 1. Overview
The **Telemetry Simulator** (`@vehicle-pulse/telemetry-generator`) is a CLI simulator that generates realistic, stateful, and reproducible vehicle telemetry without requiring any paid or external APIs.

It simulates kinematics, speed adjustments, stop/start behavior, fuel consumption, engine temperatures, battery voltage, and realistic WGS84 GPS coordinate displacement.

---

## 2. CLI Options & Parameters

| Flag | Long Option | Description | Default |
|---|---|---|---|
| `-v` | `--vehicles <number>` | Number of simulated vehicles in the fleet | `5` |
| `-r` | `--rate <number>` | Emitted events per second per vehicle | `1` |
| `-d` | `--duration <seconds>` | Total simulation runtime in seconds (`0` = infinite) | `0` |
| `-s` | `--seed <number>` | 32-bit PRNG seed for deterministic runs | `42` |
| `-o` | `--output <mode>` | Output target: `stdout` or `http` | `stdout` |
| `-e` | `--endpoint <url>` | HTTP ingestion target URL | `http://localhost/api/telemetry/v1/telemetry` |

---

## 3. Usage Examples

### 3.1 Quick Smoke Test (5 Seconds, 2 Vehicles, Stdout)
```bash
node dist/index.js --vehicles 2 --rate 2 --duration 5 --seed 42 --output stdout
```

### 3.2 High-Throughput HTTP Stress Test
Stream 50 events/second across 10 vehicles to the local Nginx ingestion endpoint:
```bash
node dist/index.js --vehicles 10 --rate 5 --duration 60 --seed 999 --output http --endpoint http://localhost/api/telemetry/v1/telemetry
```

---

## 4. Reproducibility & State Modeling
* **Deterministic PRNG:** Powered by the Mulberry32 algorithm. Running with the same `--seed` produces identical coordinates, speeds, RPMs, and fuel consumption over identical time intervals.
* **Physics & Kinematics:**
  - Acceleration applies positive G-force and increases speed, RPM, and engine temperature.
  - Braking applies negative deceleration G-force and transitions to idle or stopped.
  - Odometer accumulates based on displacement `(speed * dt) / 3600`.
  - Coordinates wander along smooth curvature with Great-circle delta calculations.
