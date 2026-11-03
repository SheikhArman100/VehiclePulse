# Event Versioning, Protocol Buffers & Schema Registry

**Project:** VehiclePulse — Real-Time Fleet Telemetry Platform  
**Component:** Event Contracts & Schema Evolution Engine (`backend/packages/event-contracts`)  
**Phase:** 30 (Completed)  
**Execution Date:** 2026-11-03

---

## 1. Schema Evolution & Compatibility Rules

In distributed streaming architectures, schema changes must never break downstream consumers.
We enforce the standard **BACKWARD Compatibility** model (compatible with Apicurio Registry / Confluent Schema Registry):

| Action | Allowed? | Impact / Compatibility Rule |
| :--- | :---: | :--- |
| **Add optional field** | ✅ Yes | Backward & Forward compatible. Legacy consumers ignore unrecognized field tags; modern consumers assign safe proto3 defaults (`0`, `""`, `false`). |
| **Remove optional field** | ✅ Yes | Allowed only if the tag index is permanently reserved (`reserved 11;`) to prevent accidental reuse. |
| **Rename field** | ✅ Yes | Protobuf serializes using field **tags (numbers)**, not string names. Renaming a field preserves wire compatibility. |
| **Change field type** | ❌ **FORBIDDEN** | **Breaking change**. Example: changing tag 6 from `double` to `string` causes wire deserialization corruption. Rejected by registry. |
| **Renumber tag index** | ❌ **FORBIDDEN** | **Breaking change**. Field numbers identify payload fields on the wire. Must never be altered. |

---

## 2. Protobuf Specifications (`proto/telemetry.proto`)

### Version 1 (Baseline Raw Telemetry):
```protobuf
syntax = "proto3";
package vehiclepulse.telemetry;

message Location {
  double latitude = 1;
  double longitude = 2;
  double heading = 3;
  double altitudeMeters = 4;
}

message RawTelemetryV1 {
  string eventId = 1;
  string vehicleId = 2;
  string deviceId = 3;
  string timestamp = 4;
  Location location = 5;
  double speedKmh = 6;
  double fuelLevelPct = 7;
  double batteryLevelPct = 8;
  double engineTempC = 9;
  double odometerKm = 10;
}
```

### Version 2 (Backward & Forward Compatible Evolution):
Adds tire pressure and ambient temperature using new tags `11` and `12`:
```protobuf
message RawTelemetryV2 {
  string eventId = 1;
  string vehicleId = 2;
  string deviceId = 3;
  string timestamp = 4;
  Location location = 5;
  double speedKmh = 6;
  double fuelLevelPct = 7;
  double batteryLevelPct = 8;
  double engineTempC = 9;
  double odometerKm = 10;
  double tirePressurePsi = 11; // Added tag 11
  double ambientTempC = 12;    // Added tag 12
}
```

---

## 3. Schema Registry Strategy & Free/Open-Source Evaluation

In accordance with VehiclePulse's **100% free/local-runnable constraint**:
1. **Self-Hosted Open-Source Choice: Apicurio Registry**:
   - License: Apache License 2.0 (Completely free, no commercial license traps).
   - Docker Profile: `apicurio/apicurio-registry-mem:latest` (runnable locally in Docker without credit cards or enterprise licenses).
2. **Local Schema Validator (`LocalSchemaRegistry`)**:
   - Included in `@vehicle-pulse/event-contracts` for instant unit-test validation.
   - Enforces tag collision detection, field type stability, and reject rules.

---

## 4. Automated Verification Results

All 10 tests passed in `@vehicle-pulse/event-contracts` test runner:
- **Serialization & Deserialization**: Binary Protobuf buffers encode and decode with exact bitwise fidelity.
- **Forward Compatibility**: Legacy V1 consumers decode V2 payloads without throwing errors (unrecognized tags 11 & 12 skipped).
- **Backward Compatibility**: Modern V2 consumers decode legacy V1 payloads, automatically applying proto3 defaults (`0` for `tirePressurePsi`).
- **Incompatible Evolution Rejection**: Changing field type (tag 6 from `double` to `string`) is detected and rejected with `Incompatible schema evolution`.

