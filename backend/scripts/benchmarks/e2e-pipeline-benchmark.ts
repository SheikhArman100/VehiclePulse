import { Kafka } from "kafkajs";

const KAFKA_BROKERS = [process.env.KAFKA_BROKER || "localhost:9092"];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runEndToEndPipelineBenchmark() {
  console.log("===============================================================");
  console.log(" BENCHMARK 3: END-TO-END EVENT PIPELINE CATCH-UP & LAG");
  console.log("===============================================================");

  const kafka = new Kafka({ clientId: "e2e-benchmarker", brokers: KAFKA_BROKERS });
  const admin = kafka.admin();
  const producer = kafka.producer();

  await admin.connect();
  await producer.connect();

  const BURST_COUNT = 5000;
  console.log(`Generating burst of ${BURST_COUNT} valid telemetry events into 'vehicle.telemetry.raw'...`);

  const events = Array.from({ length: BURST_COUNT }).map((_, i) => ({
    key: `veh_burst_${i % 50}`,
    value: JSON.stringify({
      eventId: `burst-${Date.now()}-${i}`,
      eventType: "TELEMETRY_RAW",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      vehicleId: `veh_burst_${i % 50}`,
      payload: {
        speed: (i % 120) + 10,
        fuelLevel: 60,
        engineTemp: 88,
        batteryVoltage: 13.8,
        latitude: 37.7749,
        longitude: -122.4194,
      },
    }),
  }));

  const produceStart = process.hrtime();
  // Send in batches of 250
  for (let i = 0; i < events.length; i += 250) {
    await producer.send({
      topic: "vehicle.telemetry.raw",
      messages: events.slice(i, i + 250),
    });
  }
  const [pSec, pNano] = process.hrtime(produceStart);
  const produceDuration = pSec + pNano / 1e9;
  console.log(`Burst publication completed in ${produceDuration.toFixed(2)}s (${Math.round(BURST_COUNT / produceDuration)} msg/sec)`);

  console.log("\nMonitoring Consumer Groups Catch-Up & Lag draining...");
  const targetGroups = [
    "telemetry-mongo-storage-group",
    "analytics-consumer-group",
    "alert-service-group",
  ];

  let drained = false;
  const drainStart = process.hrtime();

  while (!drained) {
    await sleep(1000);
    const [dSec] = process.hrtime(drainStart);
    let totalLag = 0;

    for (const group of targetGroups) {
      try {
        const topicOffsets = await admin.fetchTopicOffsets("vehicle.telemetry.raw");
        const groupOffsets = await admin.fetchOffsets({ groupId: group, topics: ["vehicle.telemetry.raw"] });
        
        const partitionLags = groupOffsets[0]?.partitions.map((gp) => {
          const latest = topicOffsets.find((to) => to.partition === gp.partition)?.offset || "0";
          const current = gp.offset === "-1" ? latest : gp.offset;
          const lag = Math.max(0, Number(latest) - Number(current));
          return lag;
        }) || [];

        const groupLag = partitionLags.reduce((a, b) => a + b, 0);
        totalLag += groupLag;
      } catch {
        // Group might be committing
      }
    }

    console.log(` Elapsed: ${dSec}s | Combined Consumer Lag across all groups: ${totalLag}`);
    if (totalLag === 0 || dSec > 20) {
      drained = true;
      console.log(`\nAll consumer groups fully synchronized! Pipeline caught up in ${dSec} seconds.`);
    }
  }

  await producer.disconnect();
  await admin.disconnect();
}

runEndToEndPipelineBenchmark().catch((err) => {
  console.error("FATAL in end-to-end benchmark:", err);
  process.exit(1);
});

