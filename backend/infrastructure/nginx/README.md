# Nginx Reverse Proxy (VehiclePulse)

## Purpose & Architecture
VehiclePulse uses Nginx as the single entry point (reverse proxy) for all incoming client traffic in local development and production-like environments. 

There is **no custom Node.js API Gateway or custom routing layer**; Nginx handles routing directly at layer 7.

```
                    +------------------------+
                    |    Client / Browser    |
                    +-----------+------------+
                                | Port 80
                                v
               +--------------------------------+
               |     vehiclepulse-nginx         |
               |       (Reverse Proxy)          |
               +---------------+----------------+
                               |
       +-----------------------+-----------------------+---------------------+
       |                       |                       |                     |
       v /api/telemetry/       v /api/analytics/       v /api/alerts/        v /ws
+---------------+      +---------------+      +---------------+      +---------------+
|  Telemetry    |      |   Analytics   |      |     Alert     |      |  WebSocket    |
|   Service     |      |    Service    |      |    Service    |      |  (Telemetry)  |
|  (:4001)      |      |   (:4002)     |      |   (:4003)     |      |  (:4001)      |
+---------------+      +---------------+      +---------------+      +---------------+
                               |
                               v / (Default Fallback)
                       +---------------+
                       | Frontend Web  |
                       | Next.js (:3000|
                       +---------------+
```

## Route Map & Prefix Semantics

| Path Prefix | Target Upstream | Target Port | Protocol | Purpose |
|---|---|---|---|---|
| `/nginx-health` | Internal (Nginx) | 80 | HTTP | Reverse proxy healthcheck smoke test (returns 200 JSON) |
| `/api/telemetry/` | `telemetry-service` | 4001 | HTTP | Ingestion, vehicle metadata, raw state queries |
| `/api/analytics/` | `analytics-service` | 4002 | HTTP | Aggregates, trip summaries, fleet analytics |
| `/api/alerts/` | `alert-service` | 4003 | HTTP | Incident creation, alert status, rule evaluation |
| `/ws` | `telemetry-service` | 4001 | HTTP / WS | Live state stream over WebSocket (Upgrade: websocket) |
| `/` | `frontend-web` | 3000 | HTTP | Next.js 15 Web Application fallback |

### Request Limits & Timeouts
- **Max Request Body:** `10M` (configured for high-throughput batch telemetry ingestion)
- **Proxy Connect Timeout:** `10s`
- **Proxy Send/Read Timeout:** `30s` (HTTP routes)
- **WebSocket Timeout:** `86400s` (24h keepalive for continuous WebSocket streams)

## Verification
You can verify Nginx routing locally:
```bash
# Smoke test reverse proxy health:
curl -i http://localhost/nginx-health
# Expected: HTTP/1.1 200 OK {"status":"UP","service":"nginx-reverse-proxy"}
```
