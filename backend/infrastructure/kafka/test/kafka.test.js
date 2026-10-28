"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const event_contracts_1 = require("@vehicle-pulse/event-contracts");
const topicManager_js_1 = require("../src/topicManager.js");
const testExchange_js_1 = require("../src/testExchange.js");
(0, node_test_1.describe)("Kafka Cluster & Topic Strategy Suite (Phase 10)", () => {
    (0, node_test_1.it)("should have all canonical topic specifications declared", () => {
        strict_1.default.ok(event_contracts_1.TOPIC_SPECIFICATIONS[event_contracts_1.KAFKA_TOPICS.TELEMETRY_RAW]);
        strict_1.default.ok(event_contracts_1.TOPIC_SPECIFICATIONS[event_contracts_1.KAFKA_TOPICS.TELEMETRY_PROCESSED]);
        strict_1.default.ok(event_contracts_1.TOPIC_SPECIFICATIONS[event_contracts_1.KAFKA_TOPICS.ALERTS]);
        strict_1.default.ok(event_contracts_1.TOPIC_SPECIFICATIONS[event_contracts_1.KAFKA_TOPICS.STATE]);
        strict_1.default.ok(event_contracts_1.TOPIC_SPECIFICATIONS[event_contracts_1.KAFKA_TOPICS.COMMANDS]);
        strict_1.default.equal(event_contracts_1.TOPIC_SPECIFICATIONS[event_contracts_1.KAFKA_TOPICS.TELEMETRY_RAW].numPartitions, 3);
        strict_1.default.equal(event_contracts_1.TOPIC_SPECIFICATIONS[event_contracts_1.KAFKA_TOPICS.STATE].cleanupPolicy, "compact");
    });
    (0, node_test_1.it)("should ensure all topics exist on the running Kafka cluster", async () => {
        const { created, alreadyExisted } = await (0, topicManager_js_1.provisionTopics)();
        const total = created.length + alreadyExisted.length;
        strict_1.default.equal(total, 5, "All 5 canonical topics must be accounted for");
        const topics = await (0, topicManager_js_1.inspectTopics)();
        const topicNames = topics.map((t) => t.name);
        strict_1.default.ok(topicNames.includes(event_contracts_1.KAFKA_TOPICS.TELEMETRY_RAW));
        strict_1.default.ok(topicNames.includes(event_contracts_1.KAFKA_TOPICS.TELEMETRY_PROCESSED));
        strict_1.default.ok(topicNames.includes(event_contracts_1.KAFKA_TOPICS.ALERTS));
        strict_1.default.ok(topicNames.includes(event_contracts_1.KAFKA_TOPICS.STATE));
        strict_1.default.ok(topicNames.includes(event_contracts_1.KAFKA_TOPICS.COMMANDS));
        for (const topic of topics) {
            if (Object.values(event_contracts_1.KAFKA_TOPICS).includes(topic.name)) {
                strict_1.default.equal(topic.partitions.length, 3, `Topic ${topic.name} must have exactly 3 partitions`);
            }
        }
    });
    (0, node_test_1.it)("should successfully exchange live events with partition keying", async () => {
        const result = await (0, testExchange_js_1.runEventExchangeVerification)();
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.receivedEvents, 1);
        strict_1.default.ok(result.partitionUsed >= 0 && result.partitionUsed < 3);
        strict_1.default.equal(result.vehicleId, "veh_test_phase10_verifier");
    });
});
