/**
 * Canonical Kafka Topic Definitions & Metadata
 *
 * Defines all standard topics for VehiclePulse event streaming.
 */

export const KAFKA_TOPICS = {
  TELEMETRY_RAW: "vehicle.telemetry.raw",
  TELEMETRY_PROCESSED: "vehicle.telemetry.processed",
  ALERTS: "vehicle.alerts",
  STATE: "vehicle.state",
  COMMANDS: "vehicle.commands",
} as const;

export type KafkaTopicName = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

export interface TopicConfigDefinition {
  name: KafkaTopicName;
  numPartitions: number;
  replicationFactor: number;
  cleanupPolicy: "delete" | "compact";
  retentionMs?: number;
  segmentBytes?: number;
  minCleanableDirtyRatio?: number;
  description: string;
}

/**
 * Standard configuration for all VehiclePulse Kafka topics.
 *
 * Partition count rationale:
 * - 3 partitions locally allows testing consumer group rebalances, concurrent consumers,
 *   and partition-key assignment across multiple workers on a single developer machine.
 */
export const TOPIC_SPECIFICATIONS: Record<KafkaTopicName, TopicConfigDefinition> = {
  [KAFKA_TOPICS.TELEMETRY_RAW]: {
    name: KAFKA_TOPICS.TELEMETRY_RAW,
    numPartitions: 3,
    replicationFactor: 1, // Single broker locally; scalable in production
    cleanupPolicy: "delete",
    retentionMs: 86_400_000 * 3, // 3 days retention for high-frequency raw telemetry
    description: "High-volume raw telemetry ingest stream partitioned by vehicleId",
  },
  [KAFKA_TOPICS.TELEMETRY_PROCESSED]: {
    name: KAFKA_TOPICS.TELEMETRY_PROCESSED,
    numPartitions: 3,
    replicationFactor: 1,
    cleanupPolicy: "delete",
    retentionMs: 86_400_000 * 7, // 7 days retention for enriched/validated telemetry
    description: "Enriched and validated telemetry stream for analytics consumers",
  },
  [KAFKA_TOPICS.ALERTS]: {
    name: KAFKA_TOPICS.ALERTS,
    numPartitions: 3,
    replicationFactor: 1,
    cleanupPolicy: "delete",
    retentionMs: 86_400_000 * 14, // 14 days retention for alerts & safety incidents
    description: "Triggered alert events partitioned by vehicleId",
  },
  [KAFKA_TOPICS.STATE]: {
    name: KAFKA_TOPICS.STATE,
    numPartitions: 3,
    replicationFactor: 1,
    cleanupPolicy: "compact", // Log compaction retains the latest state per vehicleId key
    minCleanableDirtyRatio: 0.1,
    description: "Compacted topic holding the latest known state snapshot per vehicleId",
  },
  [KAFKA_TOPICS.COMMANDS]: {
    name: KAFKA_TOPICS.COMMANDS,
    numPartitions: 3,
    replicationFactor: 1,
    cleanupPolicy: "delete",
    retentionMs: 86_400_000 * 7, // 7 days retention for command history
    description: "Downlink commands dispatched to edge devices and vehicles",
  },
};
