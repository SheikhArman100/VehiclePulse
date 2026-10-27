import { Router, Request, Response } from "express";

export type HealthCheckFn = () => Promise<boolean | Record<string, unknown>>;

export interface HealthRouterOptions {
  serviceName: string;
  version?: string;
  readinessChecks?: Record<string, HealthCheckFn>;
}

/**
 * Creates standardized `/health/live` and `/health/ready` endpoints.
 */
export function createHealthRouter(options: HealthRouterOptions): Router {
  const router = Router();
  const startTime = Date.now();

  // Liveness check: Is the process up and accepting HTTP?
  router.get("/health/live", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "UP",
      service: options.serviceName,
      version: options.version || "1.0.0",
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness check: Are all dependencies (DB, brokers) connected and healthy?
  router.get("/health/ready", async (_req: Request, res: Response) => {
    const checks = options.readinessChecks || {};
    const checkResults: Record<string, unknown> = {};
    let isReady = true;

    for (const [name, checkFn] of Object.entries(checks)) {
      try {
        const result = await checkFn();
        if (result === false) {
          isReady = false;
          checkResults[name] = { status: "DOWN" };
        } else if (typeof result === "object") {
          checkResults[name] = result;
        } else {
          checkResults[name] = { status: "UP" };
        }
      } catch (err) {
        isReady = false;
        checkResults[name] = {
          status: "DOWN",
          error: (err as Error).message,
        };
      }
    }

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
      status: isReady ? "READY" : "NOT_READY",
      service: options.serviceName,
      version: options.version || "1.0.0",
      checks: checkResults,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
