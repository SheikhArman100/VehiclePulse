import express, { type Application } from "express";
import cors from "cors";
import { type Logger } from "@vehicle-pulse/logger";
import {
  correlationIdMiddleware,
  createErrorHandler,
  createHealthRouter,
  notFoundHandler,
} from "@vehicle-pulse/shared";
import { ApplicationRouters } from "./app/routes/index.js";

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

  // Health and diagnostic routes
  const healthRouter = createHealthRouter({
    serviceName: "telemetry-service",
    version: "1.0.0",
    readinessChecks: {
      inMemoryModule: async () => ({ status: "UP", type: "module-based-skeleton" }),
    },
  });
  app.use(healthRouter);
  app.use("/api/telemetry", healthRouter);

  // Application Routes (both direct /api/v1 and reverse-proxied /api/telemetry/v1)
  app.use("/api/v1", ApplicationRouters);
  app.use("/api/telemetry/v1", ApplicationRouters);

  // 404 & Centralized Error Handlers
  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger));

  return app;
}
