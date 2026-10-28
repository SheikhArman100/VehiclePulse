import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KAFKA_TOPICS, TOPIC_SPECIFICATIONS } from "@vehicle-pulse/event-contracts";
import { inspectTopics, provisionTopics } from "../src/topicManager.js";
import { runEventExchangeVerification } from "../src/testExchange.js";

describe("Kafka Cluster & Topic Strategy Suite (Phase 10)", () => {
  it("should have all canonical topic specifications declared", () => {
    assert.ok(TOPIC_SPECIFICATIONS[KAFKA_TOPICS.TELEMETRY_RAW]);
    assert.ok(TOPIC_SPECIFICATIONS[KAFKA_TOPICS.TELEMETRY_PROCESSED]);
    assert.ok(TOPIC_SPECIFICATIONS[KAFKA_TOPICS.ALERTS]);
    assert.ok(TOPIC_SPECIFICATIONS[KAFKA_TOPICS.STATE]);
    assert.ok(TOPIC_SPECIFICATIONS[KAFKA_TOPICS.COMMANDS]);

    assert.equal(TOPIC_SPECIFICATIONS[KAFKA_TOPICS.TELEMETRY_RAW].numPartitions, 3);
    assert.equal(TOPIC_SPECIFICATIONS[KAFKA_TOPICS.STATE].cleanupPolicy, "compact");
  });

  it("should ensure all topics exist on the running Kafka cluster", async () => {
    const { created, alreadyExisted } = await provisionTopics();
    const total = created.length + alreadyExisted.length;
    assert.equal(total, 5, "All 5 canonical topics must be accounted for");

    const topics = await inspectTopics();
    const topicNames = topics.map((t) => t.name);

    assert.ok(topicNames.includes(KAFKA_TOPICS.TELEMETRY_RAW));
    assert.ok(topicNames.includes(KAFKA_TOPICS.TELEMETRY_PROCESSED));
    assert.ok(topicNames.includes(KAFKA_TOPICS.ALERTS));
    assert.ok(topicNames.includes(KAFKA_TOPICS.STATE));
    assert.ok(topicNames.includes(KAFKA_TOPICS.COMMANDS));

    for (const topic of topics) {
      if (Object.values(KAFKA_TOPICS).includes(topic.name as any)) {
        assert.equal(
          topic.partitions.length,
          3,
          `Topic ${topic.name} must have exactly 3 partitions`
        );
      }
    }
  });

  it("should successfully exchange live events with partition keying", async () => {
    const result = await runEventExchangeVerification();
    assert.equal(result.success, true);
    assert.equal(result.receivedEvents, 1);
    assert.ok(result.partitionUsed >= 0 && result.partitionUsed < 3);
    assert.equal(result.vehicleId, "veh_test_phase10_verifier");
  });
});
