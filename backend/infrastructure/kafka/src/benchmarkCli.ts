import { runKafkaBenchmark, type BenchmarkConfig } from "./benchmark.js";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const args = process.argv.slice(2);
  const events = parseInt(args.find((a) => a.startsWith("--events="))?.split("=")[1] || "10000", 10);
  const batchSize = parseInt(args.find((a) => a.startsWith("--batch="))?.split("=")[1] || "100", 10);
  const vehicles = parseInt(args.find((a) => a.startsWith("--vehicles="))?.split("=")[1] || "50", 10);
  const compression = (args.find((a) => a.startsWith("--compression="))?.split("=")[1] || "none") as any;

  const config: BenchmarkConfig = {
    targetEvents: events,
    batchSize,
    vehicleCount: vehicles,
    compression,
    concurrency: 1,
  };

  console.log(`==> Running Kafka Producer Benchmark: ${config.targetEvents} events (batch: ${config.batchSize}, compression: ${config.compression})...`);
  const report = await runKafkaBenchmark(config);

  console.log("\n================ BENCHMARK RESULTS ================");
  console.log(`Hardware: ${report.hardware.cpuModel} (${report.hardware.cpuCores} cores, ${report.hardware.totalMemGB} GB RAM)`);
  console.log(`Total Events Sent:    ${report.results.totalEventsSent.toLocaleString()}`);
  console.log(`Elapsed Time:         ${(report.results.elapsedMs / 1000).toFixed(2)}s`);
  console.log(`Throughput (evt/sec): ${report.results.throughputEventsSec.toLocaleString()} evt/s`);
  console.log(`Throughput (MB/sec):  ${report.results.throughputMBs} MB/s`);
  console.log(`Avg Batch Latency:    ${report.results.avgLatencyMs} ms`);
  console.log(`p50 / p95 / p99:      ${report.results.p50LatencyMs}ms / ${report.results.p95LatencyMs}ms / ${report.results.p99LatencyMs}ms`);
  console.log(`Errors:               ${report.results.errorCount}`);
  console.log("====================================================\n");

  // Save report to docs/benchmarks/
  const outputDir = path.resolve(process.cwd(), "../../../docs/benchmarks");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `kafka_benchmark_${config.targetEvents}_batch${config.batchSize}_${config.compression}.json`;
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
  console.log(`✔ Raw benchmark report saved to: ${filePath}`);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
