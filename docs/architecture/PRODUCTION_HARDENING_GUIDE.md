# Phase 37 — Production-Style Docker and Nginx Hardening

**Project:** VehiclePulse — Real-Time Vehicle Telemetry & Event Streaming Platform  
**Phase Reference:** Phase 37 — Production-Style Docker and Nginx Hardening  
**Author:** Lead Backend Architect & DevOps Engineer  
**Date:** 2026-11-18  
**Verification Target:** Reproducible, hardened, multi-stage containerized environment with Nginx gateway  

---

## 1. Executive Summary

Phase 37 hardens VehiclePulse's container topology and edge reverse proxy into a production-like architecture without requiring paid cloud infrastructure or external hosting dependencies.

### Key Hardening Measures Implemented

1. **Non-Root Execution (`USER node:node`)**:
   - Every Node.js service Dockerfile (`telemetry-service`, `analytics-service`, `alert-service`, `command-worker`, and Next.js `frontend-web`) implements non-root execution. Processes run as `uid=1000(node) gid=1000(node)` instead of privileged `root`, mitigating container breakout vulnerabilities.
2. **PID 1 Signal Handling with `dumb-init`**:
   - Containers use `dumb-init` as the `ENTRYPOINT`. In Docker, Node.js running as PID 1 often fails to forward `SIGTERM` / `SIGINT` signals properly, leading to abrupt kills. `dumb-init` guarantees graceful shutdown, connection draining, and offset commits within the configured shutdown windows.
3. **Multi-Stage Next.js Production Build**:
   - Authored standalone multi-stage Dockerfile (`frontend/web/Dockerfile`) utilizing Next.js `output: "standalone"` to bundle only the necessary traced dependencies, drastically reducing image size and attack surface.
4. **Nginx Edge Hardening**:
   - Upgraded worker connections to 2,048.
   - Disabled server tokens (`server_tokens off`).
   - Injected mandatory security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`.
   - Applied rate-limiting zones:
     - Ingestion API: `limit_req_zone $binary_remote_addr zone=telemetry_ingest_limit:10m rate=200r/s burst=50 nodelay;`
     - Query APIs: `limit_req_zone $binary_remote_addr zone=general_api_limit:10m rate=50r/s burst=20 nodelay;`
5. **Docker Compose Profiles**:
   - Supported lightweight default profile (`docker compose up -d`) running core microservices and data stores.
   - Enabled `--profile full` / `--profile observability` to include Prometheus (`prom/prometheus:v2.54.1`) and Grafana (`grafana/grafana:11.2.0`).

---

## 2. Verification & Runtime Evidence

### 2.1 Non-Root User & PID 1 Verification
Executed inside `vehiclepulse-telemetry-service`:
```bash
docker exec vehiclepulse-telemetry-service id
# Output: uid=1000(node) gid=1000(node) groups=1000(node)

docker exec vehiclepulse-telemetry-service ps aux
# Output:
# PID   USER     TIME  COMMAND
#     1 node      0:00 dumb-init -- node dist/server.js
#     7 node      0:01 node dist/server.js
```

### 2.2 Nginx Security Headers Verification
```bash
curl.exe -i http://localhost/api/telemetry/v1/vehicles
```
**HTTP Response Headers:**
```http
HTTP/1.1 200 OK
Server: nginx
Date: Wed, 18 Nov 2026 14:01:18 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 126
Connection: keep-alive
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
x-correlation-id: 94db663b-42a1-42c0-8750-cb1d7e609e5f
traceparent: 00-965f474179b8a0506387aee9a9240222-162a70a1dd03251c-01

{"statusCode":200,"success":true,"message":"Vehicles retrieved successfully","meta":{"page":1,"limit":10,"total":0},"data":[]}
```

### 2.3 WebSocket Reverse Proxy & Upgrade Verification
```bash
node -e "const WebSocket = require('ws'); const ws = new WebSocket('ws://localhost/ws'); ws.on('open', () => { ws.send(JSON.stringify({ type: 'SUBSCRIBE', vehicleId: 'veh_test' })); ... });"
```
**Output:**
```text
CONNECTED_WS
MSG: {"type":"CONNECTED","message":"Connected to VehiclePulse Live State Stream","timestamp":"2026-11-18T14:01:26.416Z"}
MSG: {"type":"SNAPSHOT","vehicleId":"veh_test","data":null}
CLOSED_WS
```

### 2.4 Compose Profiles Verification
- Default lightweight profile services:
  `docker compose -f backend/docker-compose.yml config --services`
  -> `kafka, mysql, alert-service, mongodb, rabbitmq, redis, telemetry-service, postgres, analytics-service, command-worker, nginx`
- Full observability profile services:
  `docker compose -f backend/docker-compose.yml --profile full config --services`
  -> includes `prometheus`, `grafana`

---

## 3. Single-Machine vs Production Caveats

While this environment replicates production container boundaries, non-root users, rate limits, and security headers:
1. **Host Boundary:** All containers share the host kernel, CPU cores, and memory bus. Hardware failures or OS-level reboots take down all services simultaneously.
2. **Local Storage:** Volumes are mounted to the local Docker storage driver rather than distributed NVMe SAN or cloud-managed block storage.
3. **SSL/TLS Termination:** In this local baseline, Nginx serves unencrypted HTTP/WS on port 80 for zero-dependency local development. Production deployments should attach TLS certificates via Let's Encrypt or an ingress controller.

