import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { Logger } from "@vehicle-pulse/logger";
import { AppError } from "./errors.js";

/**
 * Creates a centralized Express error handler.
 * Conceals production stack traces and ensures standardized JSON responses.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const message = isAppError ? err.message : "Internal Server Error";
    const details = isAppError ? err.details : undefined;

    const errorPayload: Record<string, unknown> = {
      success: false,
      error: {
        message,
        statusCode,
        correlationId: req.correlationId,
        requestId: req.requestId,
      },
    };

    if (details) {
      (errorPayload.error as Record<string, unknown>).details = details;
    }

    if (process.env.NODE_ENV !== "production") {
      (errorPayload.error as Record<string, unknown>).stack = err.stack;
    }

    if (statusCode >= 500) {
      logger.error(
        {
          err,
          correlationId: req.correlationId,
          requestId: req.requestId,
          path: req.originalUrl,
          method: req.method,
        },
        `[HTTP 500] Unhandled Error: ${err.message}`
      );
    } else {
      logger.warn(
        {
          correlationId: req.correlationId,
          requestId: req.requestId,
          path: req.originalUrl,
          method: req.method,
          statusCode,
        },
        `[HTTP ${statusCode}] Operational Error: ${err.message}`
      );
    }

    res.status(statusCode).json(errorPayload);
  };
}

/**
 * Express middleware for 404 Route Not Found handling.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
      statusCode: 404,
      correlationId: req.correlationId,
      requestId: req.requestId,
    },
  });
}
