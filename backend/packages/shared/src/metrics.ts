import type { Request, Response, NextFunction } from "express";
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";

/**
 * Centralized Prometheus Metrics Registry for VehiclePulse Services.
 * Enforces bounded label cardinality (no dynamic vehicleId or eventId in labels).
 */
export class MetricsRegistry {
  private static instance: MetricsRegistry;
  public readonly registry: Registry;

  // HTTP Request Metrics
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDurationSeconds: Histogram<string>;

  // Kafka Messaging Metrics
  public readonly kafkaMessagesProducedTotal: Counter<string>;
  public readonly kafkaProducerErrorsTotal: Counter<string>;
  public readonly kafkaMessagesConsumedTotal: Counter<string>;
  public readonly kafkaConsumerErrorsTotal: Counter<string>;
  public readonly kafkaConsumerLagGauge: Gauge<string>;

  // WebSocket Metrics
  public readonly websocketConnectionsActiveGauge: Gauge<string>;
  public readonly websocketMessagesBroadcastTotal: Counter<string>;

  // Database & Storage Operations
  public readonly dbOperationDurationSeconds: Histogram<string>;
  public readonly dbOperationErrorsTotal: Counter<string>;

  private constructor() {
    this.registry = new Registry();

    // Default Node.js runtime metrics (CPU, Memory, Event Loop, GC)
    collectDefaultMetrics({ register: this.registry, prefix: "vehiclepulse_" });

    // HTTP Total Requests: bounded by method, route, statusCode
    this.httpRequestsTotal = new Counter({
      name: "vehiclepulse_http_requests_total",
      help: "Total number of HTTP requests processed",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });

    // HTTP Duration: seconds histogram with standard web buckets
    this.httpRequestDurationSeconds = new Histogram({
      name: "vehiclepulse_http_request_duration_seconds",
      help: "HTTP request latency in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    // Kafka Producer
    this.kafkaMessagesProducedTotal = new Counter({
      name: "vehiclepulse_kafka_messages_produced_total",
      help: "Total messages published to Kafka",
      labelNames: ["topic"],
      registers: [this.registry],
    });

    this.kafkaProducerErrorsTotal = new Counter({
      name: "vehiclepulse_kafka_producer_errors_total",
      help: "Total errors encountered during Kafka publishing",
      labelNames: ["topic"],
      registers: [this.registry],
    });

    // Kafka Consumer
    this.kafkaMessagesConsumedTotal = new Counter({
      name: "vehiclepulse_kafka_messages_consumed_total",
      help: "Total messages consumed from Kafka",
      labelNames: ["topic", "consumer_group"],
      registers: [this.registry],
    });

    this.kafkaConsumerErrorsTotal = new Counter({
      name: "vehiclepulse_kafka_consumer_errors_total",
      help: "Total consumer errors encountered",
      labelNames: ["topic", "consumer_group"],
      registers: [this.registry],
    });

    this.kafkaConsumerLagGauge = new Gauge({
      name: "vehiclepulse_kafka_consumer_lag",
      help: "Current consumer partition lag",
      labelNames: ["topic", "consumer_group", "partition"],
      registers: [this.registry],
    });

    // WebSockets
    this.websocketConnectionsActiveGauge = new Gauge({
      name: "vehiclepulse_websocket_connections_active",
      help: "Current number of active WebSocket client connections",
      registers: [this.registry],
    });

    this.websocketMessagesBroadcastTotal = new Counter({
      name: "vehiclepulse_websocket_messages_broadcast_total",
      help: "Total WebSocket update messages dispatched to clients",
      registers: [this.registry],
    });

    // Database / Cache Latency
    this.dbOperationDurationSeconds = new Histogram({
      name: "vehiclepulse_db_operation_duration_seconds",
      help: "Database and storage operation duration in seconds",
      labelNames: ["db_system", "operation"], // e.g. ["mongodb", "insert"], ["redis", "get"]
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.dbOperationErrorsTotal = new Counter({
      name: "vehiclepulse_db_operation_errors_total",
      help: "Total database operation errors",
      labelNames: ["db_system", "operation"],
      registers: [this.registry],
    });
  }

  public static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }
}

export const metrics = MetricsRegistry.getInstance();

/**
 * Express middleware to record HTTP metrics automatically on all routes.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime();

  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;

    // Normalizing route path to prevent high cardinality (e.g. /vehicles/:id instead of raw id)
    const route = req.route ? req.baseUrl + req.route.path : req.baseUrl || req.path;
    const statusCode = res.statusCode ? String(res.statusCode) : "500";

    metrics.httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    metrics.httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      duration
    );
  });

  next();
}

/**
 * Standard HTTP handler exposing Prometheus scrape endpoint (/metrics).
 */
export async function metricsEndpointHandler(_req: Request, res: Response): Promise<void> {
  res.setHeader("Content-Type", metrics.registry.contentType);
  const data = await metrics.registry.metrics();
  res.send(data);
}
