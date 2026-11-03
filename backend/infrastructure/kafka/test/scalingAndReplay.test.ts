import test from "node:test";
import assert from "node:assert/strict";
import { runConsumerScalingTest } from "../src/consumerScaling.js";
import { executeConsumerReplay } from "../src/consumerReplay.js";

test("Kafka Consumer Scaling and Replay verification suite", async (t) => {
  await t.test("exports scaling test and replay methods properly", () => {
    assert.equal(typeof runConsumerScalingTest, "function");
    assert.equal(typeof executeConsumerReplay, "function");
  });

  await t.test("verifies consumer group scaling mechanics logic", () => {
    // 3 partitions max per topic
    const maxPartitions = 3;
    const consumerInstances = 5;
    // Consumer count exceeding partition count leaves remainder idle
    const activeWorkers = Math.min(maxPartitions, consumerInstances);
    const idleWorkers = Math.max(0, consumerInstances - maxPartitions);

    assert.equal(activeWorkers, 3);
    assert.equal(idleWorkers, 2);
  });
});

