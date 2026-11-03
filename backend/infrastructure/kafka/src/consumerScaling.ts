import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { KAFKA_TOPICS } from "@vehicle-pulse/event-contracts";
import { createLogger } from "@vehicle-pulse/logger";

const logger = createLogger({ serviceName: "kafka-consumer-scaling" });

export interface ScalingHarnessOptions {
  brokers: string[];
  topic?: string;
  groupId: string;
  instances: number;
  durationMs?: number;
}

export interface RebalanceMetric {
  instanceId: string;
  partitionsAssigned: number[];
  assignedAt: number;
}

export interface ConsumerScalingResult {
  instancesStarted: number;
  totalMessagesProcessed: number;
  messagesPerInstance: Record<string, number>;
  throughputMsgPerSec: number;
  rebalancesObserved: number;
  assignments: Record<string, number[]>;
}

/**
 * Simulates and measures multi-consumer concurrency and dynamic rebalancing across topic partitions.
 */
export async function runConsumerScalingTest(
  options: ScalingHarnessOptions
): Promise<ConsumerScalingResult> {
  const {
    brokers,
    topic = KAFKA_TOPICS.TELEMETRY_RAW,
    groupId,
    instances,
    durationMs = 5000,
  } = options;

  logger.info({ brokers, topic, groupId, instances }, "Starting Kafka consumer scaling test");

  const kafka = new Kafka({
    clientId: "kafka-scaling-harness",
    brokers,
  });

  const consumers: Array<{ id: string; consumer: Consumer }> = [];
  const messagesPerInstance: Record<string, number> = {};
  const assignments: Record<string, number[]> = {};
  let totalMessagesProcessed = 0;
  let rebalancesObserved = 0;

  for (let i = 1; i <= instances; i++) {
    const instanceId = `consumer-worker-${i}`;
    messagesPerInstance[instanceId] = 0;
    assignments[instanceId] = [];

    const consumer = kafka.consumer({
      groupId,
      sessionTimeout: 10000,
      heartbeatInterval: 3000,
    });

    consumer.on(consumer.events.GROUP_JOIN, (e) => {
      rebalancesObserved++;
      const assigned = Object.keys(e.payload.memberAssignment || {}).map(Number);
      assignments[instanceId] = assigned;
      logger.info(
        { instanceId, assignedPartitions: assigned },
        "Consumer instance joined group / partition assigned"
      );
    });

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      autoCommit: true,
      eachMessage: async (_payload: EachMessagePayload) => {
        totalMessagesProcessed++;
        messagesPerInstance[instanceId] = (messagesPerInstance[instanceId] || 0) + 1;
      },
    });

    consumers.push({ id: instanceId, consumer });
  }

  const startTime = Date.now();
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  const elapsedSec = (Date.now() - startTime) / 1000;

  // Graceful shutdown of all scaling instances
  for (const { id, consumer } of consumers) {
    logger.info({ id }, "Disconnecting scaling consumer instance");
    await consumer.disconnect();
  }

  const throughputMsgPerSec = Math.round((totalMessagesProcessed / elapsedSec) * 10) / 10;

  return {
    instancesStarted: instances,
    totalMessagesProcessed,
    messagesPerInstance,
    throughputMsgPerSec,
    rebalancesObserved,
    assignments,
  };
}
