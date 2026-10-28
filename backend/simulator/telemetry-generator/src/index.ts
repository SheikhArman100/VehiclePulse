import { Command } from "commander";
import { createLogger } from "@vehicle-pulse/logger";
import { StatefulVehicleModel } from "./vehicleModel.js";

const logger = createLogger({
  serviceName: "telemetry-generator",
  level: "info",
});

export interface SimulatorOptions {
  vehicles: number;
  rate: number;       // events per second per vehicle
  duration: number;   // total seconds (0 = run forever)
  seed: number;
  output: "stdout" | "http";
  endpoint: string;
}

export async function runSimulator(options: SimulatorOptions): Promise<void> {
  const { vehicles, rate, duration, seed, output, endpoint } = options;

  logger.info(
    { vehicles, rate, duration: duration > 0 ? `${duration}s` : "infinite", seed, output },
    "Starting VehiclePulse Stateful Telemetry Simulator"
  );

  // Initialize fleet models
  const fleet: StatefulVehicleModel[] = [];
  for (let i = 1; i <= vehicles; i++) {
    const vId = `veh_sim_${String(i).padStart(3, "0")}`;
    const dId = `dev_sim_${String(i).padStart(3, "0")}`;
    const vin = `1HGCR2F83HA${String(100000 + i)}`;
    fleet.push(new StatefulVehicleModel(vId, dId, vin, seed + i * 997));
  }

  const intervalMs = Math.max(10, Math.floor(1000 / rate));
  let totalEventsGenerated = 0;
  const startTime = Date.now();
  let lastReportTime = startTime;
  let running = true;

  const shutdown = () => {
    running = false;
    const elapsedSec = (Date.now() - startTime) / 1000;
    const measuredRate = (totalEventsGenerated / elapsedSec).toFixed(1);
    logger.info(
      { totalEventsGenerated, elapsedSeconds: elapsedSec.toFixed(1), measuredRate: `${measuredRate} evt/s` },
      "Simulator terminated cleanly."
    );
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const timer = setInterval(async () => {
    if (!running) return;

    for (const vehicle of fleet) {
      const event = vehicle.tick(intervalMs / 1000);
      totalEventsGenerated++;

      if (output === "stdout") {
        console.log(JSON.stringify(event));
      } else if (output === "http") {
        try {
          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event),
          }).catch(() => {
            // Non-blocking in fire-and-forget ingestion mode
          });
        } catch {
          // Ignore connection errors in continuous load mode
        }
      }
    }

    // Periodic throughput measurement
    const now = Date.now();
    if (now - lastReportTime >= 5000) {
      const elapsedTotalSec = (now - startTime) / 1000;
      const currentRate = (totalEventsGenerated / elapsedTotalSec).toFixed(1);
      logger.info(
        { events: totalEventsGenerated, measuredRate: `${currentRate} evt/s` },
        "Simulator telemetry emission progress"
      );
      lastReportTime = now;
    }

    // Duration limit check
    if (duration > 0 && (now - startTime) / 1000 >= duration) {
      clearInterval(timer);
      shutdown();
    }
  }, intervalMs);
}

// CLI entry point
const program = new Command();
program
  .name("telemetry-sim")
  .description("VehiclePulse realistic stateful telemetry generator")
  .option("-v, --vehicles <number>", "Number of vehicles in simulated fleet", "5")
  .option("-r, --rate <number>", "Emitted events per second per vehicle", "1")
  .option("-d, --duration <seconds>", "Run duration in seconds (0 = infinite)", "0")
  .option("-s, --seed <number>", "PRNG seed for reproducible generation", "42")
  .option("-o, --output <mode>", "Output mode: 'stdout' or 'http'", "stdout")
  .option("-e, --endpoint <url>", "HTTP ingestion endpoint URL", "http://localhost/api/telemetry/v1/telemetry")
  .action((opts) => {
    runSimulator({
      vehicles: parseInt(opts.vehicles, 10),
      rate: parseFloat(opts.rate),
      duration: parseInt(opts.duration, 10),
      seed: parseInt(opts.seed, 10),
      output: opts.output,
      endpoint: opts.endpoint,
    });
  });

program.parse(process.argv);
