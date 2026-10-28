import { createKafkaClient, type Admin } from "@vehicle-pulse/shared";
import { TOPIC_SPECIFICATIONS, KAFKA_TOPICS, type TopicConfigDefinition } from "@vehicle-pulse/event-contracts";
import { Logger } from "@vehicle-pulse/logger";

export interface ProvisionTopicsOptions {
  brokers?: string[];
  clientId?: string;
}

export const getBrokers = (explicit?: string[]): string[] => {
  if (explicit && explicit.length > 0) return explicit;
  const envBrokers = process.env.KAFKA_BROKERS;
  if (envBrokers) {
    return envBrokers.split(",").map((s) => s.trim());
  }
  return ["localhost:9092"];
};

export const createAdminClient = (options: ProvisionTopicsOptions = {}): Admin => {
  const brokers = getBrokers(options.brokers);
  const kafka = createKafkaClient({
    clientId: options.clientId || "vehiclepulse-kafka-admin",
    brokers,
  });
  return kafka.admin();
};

/**
 * Ensures all canonical topics exist with exact partitions, replication, and configs.
 */
export const provisionTopics = async (options: ProvisionTopicsOptions = {}): Promise<{
  created: string[];
  alreadyExisted: string[];
}> => {
  const admin = createAdminClient(options);
  const created: string[] = [];
  const alreadyExisted: string[] = [];

  try {
    await admin.connect();
    const existingTopics = await admin.listTopics();

    const topicsToCreate: Array<{
      topic: string;
      numPartitions: number;
      replicationFactor: number;
      configEntries: Array<{ name: string; value: string }>;
    }> = [];

    for (const spec of Object.values(TOPIC_SPECIFICATIONS)) {
      if (existingTopics.includes(spec.name)) {
        alreadyExisted.push(spec.name);
        continue;
      }

      const configEntries: Array<{ name: string; value: string }> = [
        { name: "cleanup.policy", value: spec.cleanupPolicy },
      ];

      if (spec.retentionMs) {
        configEntries.push({ name: "retention.ms", value: spec.retentionMs.toString() });
      }

      if (spec.minCleanableDirtyRatio !== undefined) {
        configEntries.push({
          name: "min.cleanable.dirty.ratio",
          value: spec.minCleanableDirtyRatio.toString(),
        });
      }

      topicsToCreate.push({
        topic: spec.name,
        numPartitions: spec.numPartitions,
        replicationFactor: spec.replicationFactor,
        configEntries,
      });
      created.push(spec.name);
    }

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate,
        waitForLeaders: true,
      });
    }

    return { created, alreadyExisted };
  } finally {
    await admin.disconnect();
  }
};

/**
 * Returns detailed partition and metadata information for all topics.
 */
export const inspectTopics = async (options: ProvisionTopicsOptions = {}) => {
  const admin = createAdminClient(options);
  try {
    await admin.connect();
    const topicList = await admin.listTopics();
    const canonicalNames = Object.values(KAFKA_TOPICS) as string[];
    const topicsToDescribe = topicList.filter((t) => canonicalNames.includes(t) || !t.startsWith("_"));

    if (topicsToDescribe.length === 0) {
      return [];
    }

    const metadata = await admin.fetchTopicMetadata({ topics: topicsToDescribe });
    return metadata.topics;
  } finally {
    await admin.disconnect();
  }
};

/**
 * Returns consumer groups registered with the cluster.
 */
export const inspectConsumerGroups = async (options: ProvisionTopicsOptions = {}) => {
  const admin = createAdminClient(options);
  try {
    await admin.connect();
    const groups = await admin.listGroups();
    return groups.groups;
  } finally {
    await admin.disconnect();
  }
};
