import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * OpenTelemetry W3C Trace Context Specification Implementation.
 * 100% Free / In-process Zero-dependency Distributed Tracing.
 *
 * Traceparent header format:
 * version-trace_id-parent_id-trace_flags
 * Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 */

export const TRACEPARENT_HEADER = "traceparent";
export const TRACESTATE_HEADER = "tracestate";

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: string; // '01' sampled, '00' not sampled
  correlationId?: string;
}

export interface TraceContext {
  spanContext: SpanContext;
  serviceName: string;
  startTime: [number, number];
}

// Thread-safe AsyncLocalStorage for holding current trace context across async tasks
export const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Generates a standard W3C compliant 16-byte (32 hex char) trace ID.
 */
export function generateTraceId(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Generates a standard W3C compliant 8-byte (16 hex char) span ID.
 */
export function generateSpanId(): string {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * Parses an incoming W3C traceparent header string.
 */
export function parseTraceparent(header?: string): SpanContext | null {
  if (!header || typeof header !== "string") return null;

  const parts = header.trim().split("-");
  if (parts.length < 4) return null;

  const [version, traceId, spanId, traceFlags] = parts;
  if (version !== "00" && version !== "01") return null;
  if (traceId.length !== 32 || spanId.length !== 16) return null;

  return {
    traceId,
    spanId: generateSpanId(), // create child span
    parentSpanId: spanId,
    traceFlags: traceFlags || "01",
  };
}

/**
 * Formats a SpanContext into a standard W3C traceparent header string.
 */
export function formatTraceparent(spanContext: SpanContext): string {
  return `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags || "01"}`;
}

/**
 * Injects W3C traceparent into an outgoing headers object (for HTTP clients or Kafka headers).
 */
export function injectTraceContext(headers: Record<string, any> = {}): Record<string, any> {
  const current = traceStorage.getStore();
  if (current) {
    headers[TRACEPARENT_HEADER] = formatTraceparent(current.spanContext);
    if (current.spanContext.correlationId) {
      headers["x-correlation-id"] = current.spanContext.correlationId;
    }
  }
  return headers;
}

/**
 * Express middleware that initializes or propagates W3C Trace Context and connects with x-correlation-id.
 */
export function openTelemetryMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawTraceparent = req.headers[TRACEPARENT_HEADER] as string | undefined;
    const parsed = parseTraceparent(rawTraceparent);

    const spanContext: SpanContext = parsed || {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      traceFlags: "01",
      correlationId: (req as any).correlationId,
    };

    if ((req as any).correlationId && !spanContext.correlationId) {
      spanContext.correlationId = (req as any).correlationId;
    }

    const traceContext: TraceContext = {
      spanContext,
      serviceName,
      startTime: process.hrtime(),
    };

    // Propagate traceparent in response headers
    res.setHeader(TRACEPARENT_HEADER, formatTraceparent(spanContext));

    traceStorage.run(traceContext, () => {
      next();
    });
  };
}

/**
 * Helper to run an async operation within an extracted Kafka message trace context.
 */
export async function runInKafkaTraceContext<T>(
  headers: Record<string, any> | undefined,
  serviceName: string,
  fn: () => Promise<T>
): Promise<T> {
  const rawHeader = headers?.[TRACEPARENT_HEADER]?.toString();
  const parsed = parseTraceparent(rawHeader);

  const spanContext: SpanContext = parsed || {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    traceFlags: "01",
    correlationId: headers?.["x-correlation-id"]?.toString(),
  };

  const traceContext: TraceContext = {
    spanContext,
    serviceName,
    startTime: process.hrtime(),
  };

  return traceStorage.run(traceContext, fn);
}

