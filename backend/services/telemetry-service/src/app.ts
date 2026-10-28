import express, { type Application } from "express";
import cors from "cors";
import { type Logger } from "@vehicle-pulse/logger";
import {
  correlationIdMiddleware,
  createErrorHandler,
  createHealthRouter,
  notFoundHandler,
} from "@vehicle-pulse/shared";
import swaggerUi from "swagger-ui-express";
import { isDatabaseHealthy } from "./app/db/database.js";
import { ApplicationRouters } from "./app/routes/index.js";
import { openApiSpec } from "./app/docs/openApiSpec.js";

export interface AppOptions {
  logger: Logger;
}

export function createApp(options: AppOptions): Application {
  const app = express();

  // Middleware pipeline
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(correlationIdMiddleware);

  // Health and diagnostic routes with live MongoDB connection check
  const healthRouter = createHealthRouter({
    serviceName: "telemetry-service",
    version: "1.0.0",
    readinessChecks: {
      mongodb: async () => ({
        status: isDatabaseHealthy() ? "UP" : "DOWN",
      }),
    },
  });
  app.use(healthRouter);
  app.use("/api/telemetry", healthRouter);

  // Application Routes (both direct /api/v1 and reverse-proxied /api/telemetry/v1)
  app.use("/api/v1", ApplicationRouters);
  app.use("/api/telemetry/v1", ApplicationRouters);

  // OpenAPI 3.1 & Interactive Swagger UI Documentation
  app.get("/docs/json", (_req, res) => res.status(200).json(openApiSpec));
  app.get("/api/telemetry/docs/json", (_req, res) => res.status(200).json(openApiSpec));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use("/api/telemetry/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // 404 & Centralized Error Handlers
  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger));

  return app;
}
