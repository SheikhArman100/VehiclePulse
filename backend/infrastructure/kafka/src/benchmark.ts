import { CompressionTypes } from "kafkajs";
import { createKafkaClient } from "@vehicle-pulse/shared";
import { KAFKA_TOPICS, type TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import { randomUUID } from "node:crypto";
import os from "node:os";

export interface BenchmarkConfig {
  targetEvents: number;
  batchSize: number;
  vehicleCount: number;
  compression: "none" | "gzip" | "lz4" | "snappy";
  concurrency: number; // concurrent producers
  brokers?: string[];
  topic?: string;
}

export interface BenchmarkReport {
  timestamp: string;
  hardware: {
    cpuModel: string;
    cpuCores: number;
    totalMemGB: string;
    freeMemGB: string;
    platform: string;
  };
  config: BenchmarkConfig;
  results: {
    totalEventsSent: number;
    totalBytesSent: number;
    elapsedMs: number;
    throughputEventsSec: number;
    throughputMBs: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    errorCount: number;
  };
}

const getCompressionType = (compression: string): CompressionTypes => {
  switch (compression) {
    case "gzip":
      return CompressionTypes.GZIP;
    case "snappy":
      return CompressionTypes.Snappy;
    case "lz4":
      return CompressionTypes.LZ4;
    default:
      return CompressionTypes.None;
  }
};

/**
 * Generates a pre-allocated sample TelemetryRawEvent for low GC overhead during load runs.
 */
function createBenchmarkEvent(vehicleId: string, seq: number): TelemetryRawEvent {
  return {
    eventId: randomUUID(),
    eventType: "telemetry.raw",
    version: "1.0.0",
    vehicleId,
    deviceId: `dev_${vehicleId}`,
    timestamp: new Date().toISOString(),
    data: {
      location: {
        latitude: 37.7749 + (seq % 100) * 0.0001,
        longitude: -122.4194 + (seq % 100) * 0.0001,
        heading: (seq * 15) % 360,
        altitude: 20,
      },
      speed: 40 + (seq % 60),
      rpm: 1500 + (seq % 2000),
      fuelLevelPercent: Math.max(10, 100 - (seq % 80)),
      engineTemperatureCelsius: 85 + (seq % 15),
      batteryVoltage: 13.8,
      odometerKm: 10000 + seq * 0.1,
      engineStatus: "ON",
      accelerationG: 0.05,
    },
  };
}

/**
 * Runs a high-throughput producer load benchmark against Kafka.
 */
export async function runKafkaBenchmark(config: BenchmarkConfig): Promise<BenchmarkReport> {
  const brokers = config.brokers ?? (process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(",") : ["localhost:9092"]);
  const topic = config.topic ?? KAFKA_TOPICS.TELEMETRY_RAW;
  const compressionType = getCompressionType(config.compression);

  const kafka = createKafkaClient({
    clientId: "vehiclepulse-benchmark-harness",
    brokers,
  });

  const producer = kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: false, // Turn off idempotency for pure raw throughput benchmarking
    retry: { retries: 2 },
  });

  await producer.connect();

  const vehicles = Array.from({ length: config.vehicleCount }, (_, i) => `veh_bench_${String(i).padStart(4, "0")}`);
  const latencies: number[] = [];
  let totalBytesSent = 0;
  let totalEventsSent = 0;
  let errorCount = 0;

  const eventsPerBatch = Math.max(1, config.batchSize);
  const totalBatches = Math.ceil(config.targetEvents / eventsPerBatch);

  const startTime = Date.now();

  try {
    for (let b = 0; b < totalBatches; b++) {
      const messages = [];
      for (let i = 0; i < eventsPerBatch; i++) {
        if (totalEventsSent >= config.targetEvents) break;
        const vId = vehicles[totalEventsSent % vehicles.length];
        const event = createBenchmarkEvent(vId, totalEventsSent);
        const serialized = JSON.stringify(event);
        totalBytesSent += Buffer.byteLength(serialized, "utf8");
        messages.push({
          key: vId,
          value: serialized,
        });
        totalEventsSent++;
      }

      if (messages.length === 0) break;

      const batchStart = Date.now();
      try {
        await producer.send({
          topic,
          messages,
          compression: compressionType,
        });
        latencies.push(Date.now() - batchStart);
      } catch (err) {
        errorCount++;
      }
    }
  } finally {
    await producer.disconnect();
  }

  const elapsedMs = Math.max(1, Date.now() - startTime);
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;
  const avgLatency = latencies.reduce((sum, v) => sum + v, 0) / (latencies.length || 1);

  const throughputEventsSec = Math.round((totalEventsSent / (elapsedMs / 1000)) * 10) / 10;
  const throughputMBs = Math.round((totalBytesSent / (1024 * 1024) / (elapsedMs / 1000)) * 100) / 100;

  return {
    timestamp: new Date().toISOString(),
    hardware: {
      cpuModel: os.cpus()[0]?.model || "Unknown CPU",
      cpuCores: os.cpus().length,
      totalMemGB: (os.totalmem() / (1024 ** 3)).toFixed(2),
      freeMemGB: (os.freemem() / (1024 ** 3)).toFixed(2),
      platform: `${os.platform()} (${os.arch()})`,
    },
    config,
    results: {
      totalEventsSent,
      totalBytesSent,
      elapsedMs,
      throughputEventsSec,
      throughputMBs,
      avgLatencyMs: Math.round(avgLatency * 10) / 10,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      errorCount,
    },
  };
}
