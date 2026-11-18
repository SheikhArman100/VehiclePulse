import http from "node:http";

interface LoadTestOptions {
  url: string;
  method?: string;
  body?: any;
  concurrency: number;
  totalRequests: number;
}

interface LoadTestSummary {
  endpoint: string;
  concurrency: number;
  totalRequests: number;
  successful: number;
  failed: number;
  durationSec: number;
  reqPerSec: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

const summaries: LoadTestSummary[] = [];

async function makeRequest(urlStr: string, method = "GET", body?: any): Promise<number> {
  const url = new URL(urlStr);
  const start = process.hrtime();

  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          const [sec, nano] = process.hrtime(start);
          const durationMs = sec * 1000 + nano / 1e6;
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
            resolve(durationMs);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runWorker(
  url: string,
  method: string,
  body: any,
  count: number,
  latencies: number[],
  failures: { count: number }
) {
  for (let i = 0; i < count; i++) {
    try {
      const lat = await makeRequest(url, method, body);
      latencies.push(lat);
    } catch {
      failures.count++;
    }
  }
}

async function runBenchmark(name: string, options: LoadTestOptions) {
  console.log(`\nBenchmarking: ${name} (Concurrency: ${options.concurrency}, Requests: ${options.totalRequests})...`);
  const latencies: number[] = [];
  const failures = { count: 0 };
  const requestsPerWorker = Math.floor(options.totalRequests / options.concurrency);

  const startTime = process.hrtime();
  const workers = Array.from({ length: options.concurrency }).map(() =>
    runWorker(options.url, options.method || "GET", options.body, requestsPerWorker, latencies, failures)
  );

  await Promise.all(workers);

  const [sec, nano] = process.hrtime(startTime);
  const durationSec = sec + nano / 1e9;
  latencies.sort((a, b) => a - b);

  const p50Ms = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95Ms = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99Ms = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const reqPerSec = Math.round(latencies.length / durationSec);

  const summary: LoadTestSummary = {
    endpoint: name,
    concurrency: options.concurrency,
    totalRequests: options.totalRequests,
    successful: latencies.length,
    failed: failures.count,
    durationSec: Number(durationSec.toFixed(2)),
    reqPerSec,
    p50Ms: Number(p50Ms.toFixed(2)),
    p95Ms: Number(p95Ms.toFixed(2)),
    p99Ms: Number(p99Ms.toFixed(2)),
  };

  summaries.push(summary);
  console.log(` -> ${reqPerSec} req/sec | p50: ${summary.p50Ms}ms | p95: ${summary.p95Ms}ms | p99: ${summary.p99Ms}ms | Failures: ${failures.count}`);
}

async function main() {
  console.log("===============================================================");
  console.log(" BENCHMARK 2: HTTP END-TO-END & REVERSE PROXY CONCURRENCY");
  console.log("===============================================================");

  // 1. Direct Telemetry Ingestion API (POST :4001) -> Kafka -> MongoDB
  await runBenchmark("Direct Telemetry Ingestion (POST :4001)", {
    url: "http://localhost:4001/api/v1/telemetry",
    method: "POST",
    concurrency: 10,
    totalRequests: 1000,
    body: {
      eventId: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
      eventType: "telemetry.raw",
      version: "1.0.0",
      vehicleId: "veh_bench_e2e",
      deviceId: "dev_bench_001",
      timestamp: new Date().toISOString(),
      data: {
        speed: 55.4,
        rpm: 2100,
        fuelLevelPercent: 75.0,
        engineTemperatureCelsius: 86.0,
        batteryVoltage: 13.8,
        odometerKm: 12500.5,
        engineStatus: "ON",
        accelerationG: 0.05,
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          heading: 180,
          altitude: 30,
        },
      },
    },
  });

  // 2. Reverse Proxied Nginx Telemetry Ingestion (Port 80)
  await runBenchmark("Nginx Ingestion Proxy (POST :80/api/telemetry/v1/telemetry)", {
    url: "http://localhost:80/api/telemetry/v1/telemetry",
    method: "POST",
    concurrency: 20,
    totalRequests: 1000,
    body: {
      eventId: "b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e",
      eventType: "telemetry.raw",
      version: "1.0.0",
      vehicleId: "veh_bench_nginx",
      deviceId: "dev_bench_002",
      timestamp: new Date().toISOString(),
      data: {
        speed: 62.1,
        rpm: 2400,
        fuelLevelPercent: 70.0,
        engineTemperatureCelsius: 87.0,
        batteryVoltage: 13.8,
        odometerKm: 13400.2,
        engineStatus: "ON",
        accelerationG: 0.02,
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          heading: 180,
          altitude: 30,
        },
      },
    },
  });

  // 3. PostgreSQL Analytics Summary Read API (GET :80/api/analytics/v1/summary)
  await runBenchmark("Analytics Summary (GET :80/api/analytics/v1/summary)", {
    url: "http://localhost:80/api/analytics/v1/summary",
    method: "GET",
    concurrency: 25,
    totalRequests: 1000,
  });

  // 4. MySQL Alerts Triage Read API (GET :80/api/alerts/v1/alerts)
  await runBenchmark("Alerts List Query (GET :80/api/alerts/v1/alerts)", {
    url: "http://localhost:80/api/alerts/v1/alerts",
    method: "GET",
    concurrency: 25,
    totalRequests: 1000,
  });

  console.log("\n--- HTTP Concurrency Benchmark Summary ---");
  console.table(summaries);
}

main().catch((err) => {
  console.error("FATAL in HTTP benchmark:", err);
  process.exit(1);
});
