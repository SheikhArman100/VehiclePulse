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
    let statusCode = isAppError ? err.statusCode : 500;
    let message = isAppError ? err.message : "Internal Server Error";
    let details = isAppError ? err.details : undefined;

    // Handle Zod Validation Errors
    if (err.name === "ZodError" && "issues" in err) {
      statusCode = 400;
      message = "Validation Error";
      details = (err as any).issues.map((issue: any) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
    }

    // Handle MongoDB / Mongoose CastError
    if (err.name === "CastError") {
      statusCode = 400;
      message = `Invalid ${(err as any).path}: ${(err as any).value}`;
    }

    // Handle MongoDB Duplicate Key Error (code 11000)
    if (err.name === "MongoServerError" && (err as any).code === 11000) {
      statusCode = 409;
      const keys = Object.keys((err as any).keyValue || {});
      message = `Duplicate key error: ${keys.join(", ")} already exists`;
      details = (err as any).keyValue;
    }

    const errorPayload: Record<string, unknown> = {
      success: false,
      statusCode,
      message,
      error: {
        message,
        statusCode,
        correlationId: req.correlationId,
        requestId: req.requestId,
      },
    };

    if (details) {
      (errorPayload.error as Record<string, unknown>).details = details;
      errorPayload.errorMessages = details;
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
        `[HTTP ${statusCode}] Operational Error: ${message}`
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
