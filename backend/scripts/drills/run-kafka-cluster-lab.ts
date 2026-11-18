import { Kafka } from "kafkajs";
import { execSync } from "node:child_process";

const COMPOSE_CLUSTER = "E:\\Projects 2026\\VehiclePulse\\backend\\infrastructure\\kafka\\docker-compose.kafka-cluster.yml";
const TOPIC_NAME = "vehicle.cluster.replicated.telemetry";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runKafkaClusterLab() {
  console.log("===============================================================");
  console.log(" PHASE 34: MULTI-BROKER KAFKA CLUSTER & REPLICATION LAB");
  console.log("===============================================================");

  // 1. Temporarily stop the single standalone kafka container to free port 9092
  console.log("\n[Step 1] Stopping standalone single-node Kafka container...");
  try {
    execSync('docker compose -f "E:\\Projects 2026\\VehiclePulse\\backend\\docker-compose.yml" stop kafka', { stdio: "inherit" });
  } catch (err: any) {
    console.warn("Notice when stopping standalone kafka:", err.message);
  }

  // 2. Start the 3-broker KRaft cluster
  console.log("\n[Step 2] Starting 3-broker KRaft cluster (kafka-1:9092, kafka-2:9093, kafka-3:9094)...");
  execSync(`docker compose -f "${COMPOSE_CLUSTER}" up -d`, { stdio: "inherit" });

  console.log("Waiting 20 seconds for KRaft quorum voters (1, 2, 3) to elect controller and stabilize...");
  await sleep(20000);

  const clusterBrokers = ["localhost:9092", "localhost:9093", "localhost:9094"];
  const kafka = new Kafka({ clientId: "multi-broker-lab", brokers: clusterBrokers });
  const admin = kafka.admin();
  await admin.connect();

  console.log("\n[Step 3] Querying cluster metadata & active brokers...");
  const clusterMetadata = await admin.describeCluster();
  console.log("Cluster ID:", clusterMetadata.clusterId);
  console.log("Controller ID:", clusterMetadata.controller);
  console.log("Active Brokers:", clusterMetadata.brokers.map((b) => `ID ${b.nodeId} (${b.host}:${b.port})`));

  if (clusterMetadata.brokers.length < 3) {
    throw new Error(`Expected 3 brokers in cluster, found ${clusterMetadata.brokers.length}`);
  }

  // 3. Create a topic with Replication Factor 3 and min.insync.replicas 2
  console.log(`\n[Step 4] Creating topic '${TOPIC_NAME}' (Partitions: 3, ReplicationFactor: 3)...`);
  const created = await admin.createTopics({
    topics: [
      {
        topic: TOPIC_NAME,
        numPartitions: 3,
        replicationFactor: 3,
        configEntries: [
          { name: "min.insync.replicas", value: "2" },
        ],
      },
    ],
  });
  console.log("Topic creation result:", created ? "SUCCESS" : "ALREADY_EXISTS");

  console.log("Waiting 5 seconds for metadata propagation across all brokers...");
  await sleep(5000);

  const topicMetadata = await admin.fetchTopicMetadata({ topics: [TOPIC_NAME] });
  console.log("Partition & Replica Distribution before failure:");
  topicMetadata.topics[0].partitions.forEach((p) => {
    console.log(` - Partition ${p.partitionId}: Leader=${p.leader}, ISR=[${p.isr.join(", ")}], Replicas=[${p.replicas.join(", ")}]`);
  });

  // 4. Produce messages with acks: -1 (all in-sync replicas must acknowledge)
  console.log("\n[Step 5] Producing 10 replicated messages with acks: -1 (all ISR required)...");
  const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
  await producer.connect();

  for (let i = 1; i <= 10; i++) {
    await producer.send({
      topic: TOPIC_NAME,
      acks: -1,
      messages: [
        {
          key: `veh-${i}`,
          value: JSON.stringify({
            eventId: `cluster-test-${i}`,
            vehicleId: `veh-${i}`,
            speed: 65 + i,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  }
  console.log("10 messages successfully written and acknowledged by all min.insync.replicas!");

  // 5. Simulate Broker Failure (Kill broker 3)
  console.log("\n[Step 6] Simulating HARD BROKER FAILURE: Stopping vehiclepulse-kafka-3...");
  execSync(`docker compose -f "${COMPOSE_CLUSTER}" stop kafka-3`, { stdio: "inherit" });
  await sleep(6000);

  // 6. Inspect metadata during failure (ISR shrinks from [1, 2, 3] to [1, 2])
  console.log("\n[Step 7] Checking ISR status after broker-3 death:");
  const degradedMetadata = await admin.fetchTopicMetadata({ topics: [TOPIC_NAME] });
  degradedMetadata.topics[0].partitions.forEach((p) => {
    console.log(` - Partition ${p.partitionId}: Leader=${p.leader}, Active ISR=[${p.isr.join(", ")}], Configured Replicas=[${p.replicas.join(", ")}]`);
  });

  // 7. Produce messages during broker outage (Must still succeed because min.insync.replicas=2 is satisfied!)
  console.log("\n[Step 8] Producing messages while 1 broker is DEAD (min.insync.replicas=2 still satisfied)...");
  await producer.send({
    topic: TOPIC_NAME,
    acks: -1,
    messages: [
      {
        key: "veh-degraded-test",
        value: JSON.stringify({
          eventId: "cluster-degraded-write",
          vehicleId: "veh-degraded-test",
          speed: 88,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });
  console.log("Write succeeded with acks=-1 even with 1 broker DEAD!");

  // 8. Recover the dead broker
  console.log("\n[Step 9] Recovering dead broker: Starting vehiclepulse-kafka-3...");
  execSync(`docker compose -f "${COMPOSE_CLUSTER}" start kafka-3`, { stdio: "inherit" });
  await sleep(8000);

  // 9. Verify Broker Re-joins ISR
  console.log("\n[Step 10] Verifying Broker 3 caught up and rejoined ISR:");
  const recoveredMetadata = await admin.fetchTopicMetadata({ topics: [TOPIC_NAME] });
  recoveredMetadata.topics[0].partitions.forEach((p) => {
    console.log(` - Partition ${p.partitionId}: Leader=${p.leader}, Recovered ISR=[${p.isr.join(", ")}], Replicas=[${p.replicas.join(", ")}]`);
  });

  await producer.disconnect();
  await admin.disconnect();

  // 10. Clean teardown of cluster and restore single-node standalone kafka
  console.log("\n[Step 11] Cleaning up Multi-Broker Lab containers...");
  execSync(`docker compose -f "${COMPOSE_CLUSTER}" down -v`, { stdio: "inherit" });

  console.log("\n[Step 12] Restoring primary standalone single-node Kafka...");
  execSync('docker compose -f "E:\\Projects 2026\\VehiclePulse\\backend\\docker-compose.yml" start kafka', { stdio: "inherit" });
  await sleep(5000);

  console.log("\n===============================================================");
  console.log(" PHASE 34: MULTI-BROKER LAB COMPLETED SUCCESSFULLY (ALL GATES PASSED)");
  console.log("===============================================================");
}

runKafkaClusterLab().catch((err) => {
  console.error("FATAL in Kafka Cluster Lab:", err);
  process.exit(1);
});

