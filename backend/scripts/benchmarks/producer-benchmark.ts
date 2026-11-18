import { Kafka, CompressionTypes } from "kafkajs";
import os from "node:os";

const KAFKA_BROKERS = [process.env.KAFKA_BROKER || "localhost:9092"];
const TOPIC_NAME = "vehicle.telemetry.raw";
const TOTAL_MESSAGES = 10000;
const BATCH_SIZES = [50, 250, 500];

interface BenchmarkResult {
  batchSize: number;
  compression: string;
  totalMessages: number;
  durationSeconds: number;
  throughputMsgSec: number;
  avgLatencyMs: number;
}

const results: BenchmarkResult[] = [];

async function runProducerBenchmark() {
  console.log("===============================================================");
  console.log(" BENCHMARK 1: KAFKA PRODUCER INGESTION THROUGHPUT (ISOLATED)");
  console.log("===============================================================");
  console.log(`Hardware: ${os.cpus()[0]?.model} (${os.cpus().length} Logical Cores)`);
  console.log(`Total RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`Target Topic: ${TOPIC_NAME}`);
  console.log(`Benchmark Volume: ${TOTAL_MESSAGES} messages per configuration\n`);

  const kafka = new Kafka({
    clientId: "producer-benchmarker",
    brokers: KAFKA_BROKERS,
  });

  const producer = kafka.producer({
    idempotent: false,
    maxInFlightRequests: 5,
  });

  await producer.connect();

  for (const batchSize of BATCH_SIZES) {
    for (const compression of [CompressionTypes.None, CompressionTypes.GZIP]) {
      const compressionName = compression === CompressionTypes.GZIP ? "GZIP" : "NONE";
      console.log(`Running: Batch Size = ${batchSize}, Compression = ${compressionName}...`);

      const totalBatches = TOTAL_MESSAGES / batchSize;
      const startTime = process.hrtime();

      for (let b = 0; b < totalBatches; b++) {
        const messages = Array.from({ length: batchSize }).map((_, i) => ({
          key: `veh_bench_${(b * batchSize + i) % 100}`,
          value: JSON.stringify({
            eventId: `bench-prod-${b}-${i}-${Date.now()}`,
            eventType: "TELEMETRY_RAW",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
            vehicleId: `veh_bench_${(b * batchSize + i) % 100}`,
            payload: {
              speed: 45 + (i % 50),
              fuelLevel: 80 - (i % 20),
              engineTemp: 88,
              batteryVoltage: 13.8,
              latitude: 37.7749 + (i * 0.0001),
              longitude: -122.4194 + (i * 0.0001),
            },
          }),
        }));

        await producer.send({
          topic: TOPIC_NAME,
          compression,
          messages,
        });
      }

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationSeconds = seconds + nanoseconds / 1e9;
      const throughputMsgSec = Math.round(TOTAL_MESSAGES / durationSeconds);
      const avgLatencyMs = Number(((durationSeconds / totalBatches) * 1000).toFixed(2));

      console.log(` -> Completed in ${durationSeconds.toFixed(2)}s | Throughput: ${throughputMsgSec} msg/sec | Latency/Batch: ${avgLatencyMs}ms`);

      results.push({
        batchSize,
        compression: compressionName,
        totalMessages: TOTAL_MESSAGES,
        durationSeconds: Number(durationSeconds.toFixed(2)),
        throughputMsgSec,
        avgLatencyMs,
      });
    }
  }

  await producer.disconnect();

  console.log("\n--- Producer Benchmark Results ---");
  console.table(results);
  return results;
}

runProducerBenchmark().catch((err) => {
  console.error("FATAL in producer benchmark:", err);
  process.exit(1);
});

