export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "VehiclePulse — Telemetry Service API",
    version: "1.0.0",
    description:
      "Telemetry ingestion, vehicle registry, and IoT device management microservice for the VehiclePulse platform.",
    contact: {
      name: "VehiclePulse Engineering",
      url: "http://localhost",
    },
  },
  servers: [
    {
      url: "http://localhost/api/telemetry",
      description: "Local Nginx Reverse Proxy (Layer 7)",
    },
    {
      url: "http://localhost:4001",
      description: "Direct Telemetry Service Container",
    },
  ],
  tags: [
    { name: "Health", description: "Diagnostics, liveness and readiness probes" },
    { name: "Vehicles", description: "Fleet vehicle management and metadata" },
    { name: "Devices", description: "IoT tracking and OBD hardware devices" },
  ],
  paths: {
    "/health/live": {
      get: {
        tags: ["Health"],
        summary: "Process Liveness Check",
        description: "Returns 200 UP if the Express application process is healthy.",
        responses: {
          "200": {
            description: "Service is live",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/health/ready": {
      get: {
        tags: ["Health"],
        summary: "Dependency Readiness Check",
        description: "Returns 200 READY if MongoDB and infrastructure are connected.",
        responses: {
          "200": {
            description: "Service dependencies are healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReadyResponse" },
              },
            },
          },
          "503": {
            description: "One or more dependencies are offline",
          },
        },
      },
    },
    "/v1/vehicles": {
      post: {
        tags: ["Vehicles"],
        summary: "Register a new vehicle",
        description: "Creates and persists a new vehicle record in MongoDB.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateVehicleRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Vehicle successfully created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleResponse" },
              },
            },
          },
          "400": {
            description: "Validation error in request payload",
          },
          "409": {
            description: "Duplicate vehicleId or vin conflict",
          },
        },
      },
      get: {
        tags: ["Vehicles"],
        summary: "List fleet vehicles",
        description: "Returns paginated list of vehicles with full-text search filter.",
        parameters: [
          {
            name: "searchTerm",
            in: "query",
            description: "Search text matching make, model, or licensePlate",
            schema: { type: "string" },
          },
          {
            name: "status",
            in: "query",
            description: "Filter by vehicle operational status",
            schema: { type: "string", enum: ["active", "inactive", "maintenance"] },
          },
          {
            name: "page",
            in: "query",
            description: "Pagination page number (default: 1)",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Pagination page size (default: 10)",
            schema: { type: "integer", default: 10 },
          },
          {
            name: "sortBy",
            in: "query",
            description: "Field to sort by (default: createdAt)",
            schema: { type: "string", default: "createdAt" },
          },
          {
            name: "sortOrder",
            in: "query",
            description: "Sort direction ('asc' or 'desc')",
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of vehicles",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleListResponse" },
              },
            },
          },
        },
      },
    },
    "/v1/vehicles/{id}": {
      get: {
        tags: ["Vehicles"],
        summary: "Get vehicle by vehicleId",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Unique vehicle identifier (e.g. veh_live_101)",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Vehicle record details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleResponse" },
              },
            },
          },
          "404": {
            description: "Vehicle not found",
          },
        },
      },
      patch: {
        tags: ["Vehicles"],
        summary: "Update vehicle fields",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateVehicleRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated vehicle record",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VehicleResponse" },
              },
            },
          },
          "404": {
            description: "Vehicle not found",
          },
        },
      },
      delete: {
        tags: ["Vehicles"],
        summary: "Delete vehicle",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Deleted vehicle confirmation",
          },
          "404": {
            description: "Vehicle not found",
          },
        },
      },
    },
    "/v1/devices": {
      post: {
        tags: ["Devices"],
        summary: "Register a tracking device",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDeviceRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Device registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeviceResponse" },
              },
            },
          },
          "409": {
            description: "Duplicate deviceId or serialNumber conflict",
          },
        },
      },
      get: {
        tags: ["Devices"],
        summary: "List tracking devices",
        responses: {
          "200": {
            description: "Paginated list of tracking hardware devices",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "UP" },
          service: { type: "string", example: "telemetry-service" },
          version: { type: "string", example: "1.0.0" },
          uptimeSeconds: { type: "integer", example: 120 },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      ReadyResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "READY" },
          service: { type: "string", example: "telemetry-service" },
          checks: {
            type: "object",
            properties: {
              mongodb: {
                type: "object",
                properties: { status: { type: "string", example: "UP" } },
              },
            },
          },
        },
      },
      CreateVehicleRequest: {
        type: "object",
        required: ["vehicleId", "vin", "make", "model", "year", "licensePlate"],
        properties: {
          vehicleId: { type: "string", example: "veh_1001" },
          vin: { type: "string", example: "1HGCR2F83HA001001" },
          make: { type: "string", example: "Tesla" },
          model: { type: "string", example: "Model 3" },
          year: { type: "integer", example: 2024 },
          licensePlate: { type: "string", example: "VP-404" },
          status: {
            type: "string",
            enum: ["active", "inactive", "maintenance"],
            default: "active",
          },
          fuelType: {
            type: "string",
            enum: ["gasoline", "diesel", "electric", "hybrid"],
            default: "electric",
          },
          deviceId: { type: "string", example: "dev_obd_01" },
        },
      },
      UpdateVehicleRequest: {
        type: "object",
        properties: {
          make: { type: "string" },
          model: { type: "string" },
          year: { type: "integer" },
          licensePlate: { type: "string" },
          status: {
            type: "string",
            enum: ["active", "inactive", "maintenance"],
          },
          fuelType: {
            type: "string",
            enum: ["gasoline", "diesel", "electric", "hybrid"],
          },
          deviceId: { type: "string" },
        },
      },
      VehicleResponse: {
        type: "object",
        properties: {
          statusCode: { type: "integer", example: 200 },
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Vehicle retrieved successfully" },
          data: {
            type: "object",
            properties: {
              id: { type: "string", example: "6ae1b660fde4788145f63806" },
              vehicleId: { type: "string", example: "veh_1001" },
              vin: { type: "string", example: "1HGCR2F83HA001001" },
              make: { type: "string", example: "Tesla" },
              model: { type: "string", example: "Model 3" },
              year: { type: "integer", example: 2024 },
              licensePlate: { type: "string", example: "VP-404" },
              status: { type: "string", example: "active" },
              fuelType: { type: "string", example: "electric" },
            },
          },
        },
      },
      VehicleListResponse: {
        type: "object",
        properties: {
          statusCode: { type: "integer", example: 200 },
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Vehicles retrieved successfully" },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 10 },
              total: { type: "integer", example: 45 },
            },
          },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/CreateVehicleRequest" },
          },
        },
      },
      CreateDeviceRequest: {
        type: "object",
        required: ["deviceId", "serialNumber"],
        properties: {
          deviceId: { type: "string", example: "dev_obd_01" },
          serialNumber: { type: "string", example: "SN-998877" },
          firmwareVersion: { type: "string", example: "v1.2.0" },
          status: {
            type: "string",
            enum: ["online", "offline", "unpaired"],
            default: "unpaired",
          },
          vehicleId: { type: "string", example: "veh_1001" },
        },
      },
      DeviceResponse: {
        type: "object",
        properties: {
          statusCode: { type: "integer", example: 201 },
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Device created successfully" },
          data: { $ref: "#/components/schemas/CreateDeviceRequest" },
        },
      },
    },
  },
};
