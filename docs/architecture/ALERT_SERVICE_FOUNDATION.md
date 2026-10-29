# Architecture Document: Alert Service Foundation & MySQL Integration

## Overview
The **Alert Service** (`backend/services/alert-service`) is the transactional incident and alert management microservice for the VehiclePulse platform. It evaluates telemetry events against configurable rules, tracks alert lifecycles, and maintains an immutable audit trail of triggered events.

---

## 1. Technology & Design Decisions

| Component | Choice | Rationale |
|---|---|---|
| **Runtime** | Node.js 22 LTS + Express + TypeScript | Lightweight, unified monorepo language, non-blocking I/O |
| **Database** | MySQL 8.4 (`vehiclepulse-mysql`) | ACID compliance, strict foreign key constraints, high concurrency row-level locking |
| **ORM / Client** | Prisma 7 (`provider = "prisma-client"`) | Rust-free pure TypeScript client generated to `src/generated` |
| **Driver Adapter** | `@prisma/adapter-mariadb` | High-performance MySQL/MariaDB driver adapter required by Prisma 7 |
| **Concurrency Control** | Optimistic Locking (`version` integer) | Prevents lost updates during concurrent alert acknowledge/resolve operations |
| **Routing Pattern** | Modular Domain Pattern (`src/app/modules/`) | Aligned with backend starter template (`E:\arman sg\Starter\backend-node-mysql`) |

---

## 2. Relational Data Models

### A. `alert_rules`
Configurable alert criteria with cooldown windows:
- `id`: UUID primary key
- `name`: Human-readable rule name
- `conditionType`: `SPEED_LIMIT`, `ENGINE_TEMP`, `BATTERY_VOLTAGE`, `HARSH_BRAKING`, `GEOFENCE`
- `thresholdValue`: Numeric limit trigger
- `severity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `cooldownSecs`: Interval before the same rule can re-trigger for a vehicle

### B. `alerts`
Tracked state machine with strict lifecycle transitions:
- Lifecycle: `OPEN` ➔ `ACKNOWLEDGED` ➔ `RESOLVED`
- `version`: Integer incremented on each mutation to enforce optimistic concurrency control
- Relations: Many-to-one with `alert_rules`, many-to-one with `incidents`, one-to-many with `alert_events`

### C. `alert_events`
Immutable record of each individual measurement that exceeded a threshold:
- `alertId`: Foreign key to parent alert
- `vehicleId`, `eventType`, `value`, `latitude`, `longitude`, `metadata`, `triggeredAt`

### D. `incidents`
Higher-level incident grouping for fleet operations:
- `status`: `ACTIVE`, `MITIGATED`, `RESOLVED`
- Relates multiple related alerts together for operational management

---

## 3. Endpoints & Gateway Routing

Accessible directly on port `4003` or through the Nginx reverse proxy on port `80`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/alerts/health/ready` | Readiness probe checking MySQL connectivity |
| `GET` | `/api/alerts/v1/alerts` | List alerts with filtering (`vehicleId`, `status`, `severity`, pagination) |
| `POST` | `/api/alerts/v1/alerts` | Manually/system trigger an alert and associated alert event |
| `GET` | `/api/alerts/v1/alerts/:id` | Fetch full alert details including event history |
| `PATCH` | `/api/alerts/v1/alerts/:id/acknowledge` | Transition `OPEN` ➔ `ACKNOWLEDGED` (guarded by optimistic lock) |
| `PATCH` | `/api/alerts/v1/alerts/:id/resolve` | Transition `ACKNOWLEDGED` ➔ `RESOLVED` |
| `GET` | `/api/alerts/v1/rules` | List configured alert rules |
| `POST` | `/api/alerts/v1/rules` | Create a new alert rule |

---

## 4. Verification Evidence

1. **Unit & Integration Suite (`src/tests/alert.test.ts`):**
   - 5/5 test assertions passed in 4.2 seconds against live MySQL.
   - Tested rule creation, alert creation, full lifecycle transitions, invalid transition rejection, and optimistic locking conflict detection (HTTP 409).
2. **Container Runtime:**
   - Container `vehiclepulse-alert-service` running healthy and connected to MySQL.
3. **Gateway Verification:**
   - `GET http://localhost/api/alerts/health/ready` ➔ `200 OK` (`mysql: UP`)
   - `GET http://localhost/api/alerts/v1/alerts` ➔ `200 OK`
   - `POST http://localhost/api/alerts/v1/alerts` ➔ `201 Created`
   - `PATCH http://localhost/api/alerts/v1/alerts/:id/acknowledge` ➔ `200 OK`
