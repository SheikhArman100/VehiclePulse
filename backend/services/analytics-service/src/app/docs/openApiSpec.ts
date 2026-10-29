export const analyticsOpenApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "VehiclePulse — Analytics Service API",
    version: "1.0.0",
    description:
      "Real-time fleet rollups, historical trip analytics, PostgreSQL window functions, and materialized view aggregations.",
    contact: {
      name: "VehiclePulse Engineering",
      url: "http://localhost",
    },
  },
  servers: [
    {
      url: "http://localhost/api/analytics",
      description: "Local Nginx Reverse Proxy Gateway",
    },
    {
      url: "http://localhost:4002",
      description: "Direct Analytics Service Container",
    },
  ],
  tags: [
    { name: "Health", description: "Liveness and PostgreSQL/Kafka readiness probes" },
    { name: "Metrics", description: "Fleet overview, hourly/daily time-series, rankings & materialized rollups" },
    { name: "Trips", description: "Active journey tracking (partial covering index) & vehicle trip history" },
  ],
  paths: {
    "/health/live": {
      get: {
        tags: ["Health"],
        summary: "Process Liveness Probe",
        responses: {
          "200": { description: "Process is live" },
        },
      },
    },
    "/health/ready": {
      get: {
        tags: ["Health"],
        summary: "PostgreSQL & Kafka Consumer Readiness",
        responses: {
          "200": { description: "Dependencies healthy" },
          "503": { description: "Dependency unavailable" },
        },
      },
    },
    "/v1/summary": {
      get: {
        tags: ["Metrics"],
        summary: "Get overall fleet analytics summary",
        description: "Returns total processed events, unique tracked vehicles, total trips, and active trips.",
        responses: {
          "200": { description: "Fleet analytics summary retrieved" },
        },
      },
    },
    "/v1/fleet/daily-rollups": {
      get: {
        tags: ["Metrics"],
        summary: "Get fleet daily summary rollups (Materialized View)",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 30 } },
        ],
        responses: {
          "200": { description: "Fleet daily rollups retrieved" },
        },
      },
    },
    "/v1/vehicles/{vehicleId}/hourly": {
      get: {
        tags: ["Metrics"],
        summary: "Get 1-hour time-bucketed statistics for a vehicle",
        parameters: [
          { name: "vehicleId", in: "path", required: true, schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 100 } },
        ],
        responses: {
          "200": { description: "Hourly vehicle statistics retrieved" },
        },
      },
    },
    "/v1/vehicles/{vehicleId}/daily": {
      get: {
        tags: ["Metrics"],
        summary: "Get daily rollup statistics for a vehicle",
        parameters: [
          { name: "vehicleId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 30 } },
        ],
        responses: {
          "200": { description: "Daily vehicle statistics retrieved" },
        },
      },
    },
    "/v1/vehicles/{vehicleId}/rankings": {
      get: {
        tags: ["Metrics"],
        summary: "Calculate moving averages and performance ranking (Window Functions)",
        description: "Executes a parameterized Common Table Expression (CTE) with AVG() OVER and DENSE_RANK() OVER.",
        parameters: [
          { name: "vehicleId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          "200": { description: "Vehicle moving averages and rankings retrieved" },
        },
      },
    },
    "/v1/trips/active": {
      get: {
        tags: ["Trips"],
        summary: "Query active in-flight trips (Partial Covering Index)",
        description: "Sub-millisecond query leveraging idx_vehicle_trips_active_covering without table heap reads.",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": { description: "Active trips retrieved" },
        },
      },
    },
    "/v1/trips/vehicles/{vehicleId}": {
      get: {
        tags: ["Trips"],
        summary: "Get historical trips for a specific vehicle",
        parameters: [
          { name: "vehicleId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": { description: "Vehicle trips retrieved" },
        },
      },
    },
  },
};
