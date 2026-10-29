export const alertOpenApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "VehiclePulse — Alert Service API",
    version: "1.0.0",
    description:
      "Incident governance, alert lifecycle management, and rules engine microservice backed by MySQL.",
    contact: {
      name: "VehiclePulse Engineering",
      url: "http://localhost",
    },
  },
  servers: [
    {
      url: "http://localhost/api/alerts",
      description: "Local Nginx Reverse Proxy Gateway",
    },
    {
      url: "http://localhost:4003",
      description: "Direct Alert Service Container",
    },
  ],
  tags: [
    { name: "Health", description: "Diagnostics, liveness and MySQL readiness probes" },
    { name: "Alerts", description: "Vehicle alerts, event tracking, and lifecycle state machine" },
    { name: "Rules", description: "Configurable alert evaluation rules" },
  ],
  paths: {
    "/health/live": {
      get: {
        tags: ["Health"],
        summary: "Process Liveness Check",
        responses: {
          "200": { description: "Service is live" },
        },
      },
    },
    "/health/ready": {
      get: {
        tags: ["Health"],
        summary: "MySQL Readiness Check",
        responses: {
          "200": { description: "MySQL connection is healthy" },
          "503": { description: "MySQL database unavailable" },
        },
      },
    },
    "/v1/alerts": {
      get: {
        tags: ["Alerts"],
        summary: "List alerts with filtering",
        parameters: [
          { name: "vehicleId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["OPEN", "ACKNOWLEDGED", "RESOLVED"] } },
          { name: "severity", in: "query", schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": { description: "Paginated list of alerts" },
        },
      },
      post: {
        tags: ["Alerts"],
        summary: "Create a new alert",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["vehicleId", "severity", "triggerValue", "thresholdValue", "message"],
                properties: {
                  vehicleId: { type: "string" },
                  severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                  triggerValue: { type: "number" },
                  thresholdValue: { type: "number" },
                  message: { type: "string" },
                  latitude: { type: "number" },
                  longitude: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Alert created successfully" },
        },
      },
    },
    "/v1/alerts/{id}": {
      get: {
        tags: ["Alerts"],
        summary: "Get alert details and associated trigger events",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Alert details retrieved" },
          "404": { description: "Alert not found" },
        },
      },
    },
    "/v1/alerts/{id}/acknowledge": {
      patch: {
        tags: ["Alerts"],
        summary: "Acknowledge an open alert (Optimistic Lock Guarded)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["acknowledgedBy"],
                properties: {
                  acknowledgedBy: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Alert acknowledged" },
          "400": { description: "Invalid lifecycle transition" },
          "409": { description: "Optimistic concurrency conflict" },
        },
      },
    },
    "/v1/alerts/{id}/resolve": {
      patch: {
        tags: ["Alerts"],
        summary: "Resolve an alert",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["resolvedBy"],
                properties: {
                  resolvedBy: { type: "string" },
                  resolutionNote: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Alert resolved" },
          "400": { description: "Invalid lifecycle transition" },
        },
      },
    },
    "/v1/rules": {
      get: {
        tags: ["Rules"],
        summary: "List all configured alert rules",
        responses: {
          "200": { description: "List of alert rules" },
        },
      },
      post: {
        tags: ["Rules"],
        summary: "Create a new alert rule",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "conditionType", "thresholdValue"],
                properties: {
                  name: { type: "string" },
                  conditionType: { type: "string" },
                  thresholdValue: { type: "number" },
                  severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                  cooldownSecs: { type: "integer", default: 300 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Alert rule created" },
        },
      },
    },
  },
};
