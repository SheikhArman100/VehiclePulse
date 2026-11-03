# Free Map Tile Strategy & Policy Documentation

**Project:** VehiclePulse — Real-Time Fleet Telemetry Platform  
**Component:** Live Vehicle Map (`frontend/web/app/map`)  
**Status:** Operational (Phase 27)

---

## 1. Zero Paid Credentials & Open-Source Guarantee

In strict accordance with the mandatory free-only constraint of VehiclePulse:
- **Zero Paid APIs / Tokens**: Neither Mapbox, Google Maps, nor MapLibre cloud tokens are required.
- **Library**: `leaflet` (v1.9.4) and `react-leaflet` (v5.0.0) — completely free, open-source under BSD-2-Clause.
- **Tile Provider**: [OpenStreetMap (OSM)](https://www.openstreetmap.org/copyright) standard tile layer:
  ```text
  https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
  ```
- **Attribution**: Clearly rendered on every map instance:
  ```html
  &copy; OpenStreetMap contributors
  ```

---

## 2. Public Tile Usage Policy & Production Recommendations

The standard OpenStreetMap tile servers are run entirely on donated resources by the OpenStreetMap Foundation.

### OSM Tile Server Usage Limits:
1. **Fair Use**: Bulk scraping or automated high-rate downloading is prohibited.
2. **User-Agent Requirement**: Production requests should supply a unique `User-Agent`.
3. **Heavy Concurrency**: Heavy fleet operations (e.g. hundreds of concurrent dispatch screens) should not rely directly on standard tile servers.

### Recommended Production Self-Hosted Alternatives (Free & Local):
- **Option A: Self-hosted TileServer GL**: Run open-source vector tiles locally in Docker:
  ```yaml
  maptiler/tileserver-gl:latest
  ```
- **Option B: Nginx Tile Caching Proxy**: Configure the existing local Nginx reverse proxy with an `nginx_cache` block to cache frequently accessed OSM tiles locally, drastically reducing outbound traffic.
- **Option C: Martin / Pg_tileserv**: Rust-based vector tile server directly querying PostgreSQL / PostGIS geometry.

