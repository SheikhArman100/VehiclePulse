import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

export const CORRELATION_ID_HEADER = "x-correlation-id";
export const REQUEST_ID_HEADER = "x-request-id";

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      requestId: string;
    }
  }
}

/**
 * Middleware that assigns or propagates correlation IDs and request IDs.
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId =
    (req.headers[CORRELATION_ID_HEADER] as string) ||
    (req.headers[REQUEST_ID_HEADER] as string) ||
    crypto.randomUUID();

  const requestId = crypto.randomUUID();

  req.correlationId = correlationId;
  req.requestId = requestId;

  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
