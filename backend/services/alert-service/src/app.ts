import express, { type Application } from "express";
import cors from "cors";
import {
  correlationIdMiddleware,
  createErrorHandler,
  createHealthRouter,
  notFoundHandler,
} from "@vehicle-pulse/shared";
import type { Logger } from "@vehicle-pulse/logger";
import swaggerUi from "swagger-ui-express";
import { getPrismaClient } from "./app/db/prisma.js";
import { ApplicationRouters } from "./app/routes/index.js";
import { alertOpenApiSpec } from "./app/docs/openApiSpec.js";

export interface CreateAppOptions {
  logger: Logger;
}

export function createApp(options: CreateAppOptions): Application {
  const app: Application = express();
  const prisma = getPrismaClient();

  // 1. Standard global middleware
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware);

  // 2. Health routes (/health/live & /health/ready)
  const healthRouter = createHealthRouter({
    serviceName: "alert-service",
    version: "1.0.0",
    readinessChecks: {
      mysql: async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return { status: "UP" };
        } catch (error) {
          return {
            status: "DOWN",
            details: error instanceof Error ? error.message : "Unknown error",
          };
        }
      },
    },
  });
  app.use(healthRouter);
  app.use("/api/alerts", healthRouter);

  // 3. OpenAPI 3.1 & Interactive Swagger UI Documentation
  app.get("/docs/json", (_req, res) => res.status(200).json(alertOpenApiSpec));
  app.get("/api/alerts/docs/json", (_req, res) => res.status(200).json(alertOpenApiSpec));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(alertOpenApiSpec));
  app.use("/api/alerts/docs", swaggerUi.serve, swaggerUi.setup(alertOpenApiSpec));

  // 4. Mount modular application routes
  app.use("/api/v1", ApplicationRouters);
  app.use("/api/alerts/v1", ApplicationRouters);

  // 5. Global 404 & Error Handler
  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger));

  return app;
}
