import express, { type Application } from "express";
import cors from "cors";
import {
  correlationIdMiddleware,
  createErrorHandler,
  createHealthRouter,
  notFoundHandler,
} from "@vehicle-pulse/shared";

import type { Logger } from "@vehicle-pulse/logger";
import { getPrismaClient } from "./app/db/prisma.js";
import { AnalyticsKafkaConsumer } from "./app/kafka/analyticsConsumer.js";
import { ApplicationRouters } from "./app/routes/index.js";



export interface CreateAppOptions {
  logger: Logger;
}

export function createApp(options: CreateAppOptions): Application {
  const app = express();
  const prisma = getPrismaClient();

  app.locals.logger = options.logger;

  // 1. Standard global middleware
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware);

  // 2. Health routes (/health/live & /health/ready)
  const healthRouter = createHealthRouter({
    serviceName: "analytics-service",
    version: "1.0.0",
    readinessChecks: {
      postgresql: async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return { status: "UP" };
        } catch (error) {
          return { status: "DOWN", details: error instanceof Error ? error.message : "Unknown error" };
        }
      },
      "kafka-consumer": async () => ({
        status: AnalyticsKafkaConsumer.getConsumerStatus().isRunning ? "UP" : "DOWN",
      }),
    },
  });
  app.use(healthRouter);
  app.use("/api/analytics", healthRouter);

  // 3. Analytics Module Routes
  app.use("/api/v1", ApplicationRouters);
  app.use("/api/analytics/v1", ApplicationRouters);

  // 4. Global 404 and error handlers

  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger));


  return app;
}

