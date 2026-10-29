import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createLogger } from "@vehicle-pulse/logger";
import {
  RabbitMQClient,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
} from "@vehicle-pulse/shared";
import type { CommandDispatchedEvent } from "@vehicle-pulse/event-contracts";
import { env } from "../config/env.js";

const testLogger = createLogger({ serviceName: "test-rabbitmq", level: "silent" });

describe("Phase 20 — RabbitMQ Jobs, Command Queues, Retries & DLQ Suite", () => {
  let rabbit: RabbitMQClient;

  before(async () => {
    rabbit = new RabbitMQClient({
      url: env.RABBITMQ_URL,
      logger: testLogger,
    });
    // Assert exchanges, queues, DLQ routing, and TTL retry bindings
    await rabbit.setupTopology();
  });

  after(async () => {
    await rabbit.close();
  });

  it("should publish a vehicle command and consume it with manual ACK", async () => {
    const testCommandId = randomUUID();
    const testVehicleId = `veh_cmd_${Date.now()}`;

    const commandEvent: CommandDispatchedEvent = {
      eventId: randomUUID(),
      eventType: "command.dispatched",
      timestamp: new Date().toISOString(),
      vehicleId: testVehicleId,
      deviceId: "obd_test_unit",
      version: "1.0.0",
      data: {
        commandId: testCommandId,
        commandType: "LOCK_DOORS",
        status: "DISPATCHED",
        timeoutSeconds: 30,
      },
    };

    let processedCommandId: string | null = null;

    // Start consuming
    await rabbit.consume<CommandDispatchedEvent>(
      RABBITMQ_QUEUES.COMMAND_EXECUTE,
      async (msg) => {
        if (msg.data.parameters?.simulateTransientError) {
          throw new Error("Simulated CAN bus network drop");
        }
        if (msg.data.commandId === testCommandId) {
          processedCommandId = msg.data.commandId;
        }
      },
      { prefetch: 1 }
    );

    // Publish to command exchange
    const published = await rabbit.publish(
      RABBITMQ_EXCHANGES.COMMAND,
      "command.execute",
      commandEvent,
      {
        correlationId: testCommandId,
        messageId: commandEvent.eventId,
      }
    );

    assert.ok(published, "Message must be accepted by exchange");

    // Poll until processed
    for (let i = 0; i < 20; i++) {
      if (processedCommandId === testCommandId) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    assert.equal(processedCommandId, testCommandId, "Command must be consumed and ACKed");
  });

  it("should forward poison non-JSON payloads directly to DLQ without crashing", async () => {
    const ch = await rabbit.connect();

    // 1. Purge DLQ queue to ensure clean test state
    await ch.purgeQueue(RABBITMQ_QUEUES.COMMAND_DLQ);

    // 2. Publish completely corrupt non-JSON raw bytes to main execute queue
    const badPayload = Buffer.from("<<<CORRUPT_NON_JSON_POISON_PILL>>>");
    ch.publish(RABBITMQ_EXCHANGES.COMMAND, "command.execute", badPayload, {
      persistent: true,
      headers: { "x-test-marker": "poison-test" },
    });

    // 3. Verify message routed to dead-letter queue (DLQ)
    let dlqMessageFound = false;
    for (let i = 0; i < 25; i++) {
      const msg = await ch.get(RABBITMQ_QUEUES.COMMAND_DLQ, { noAck: true });
      if (msg) {
        const content = msg.content.toString();
        if (content.includes("<<<CORRUPT_NON_JSON_POISON_PILL>>>")) {
          dlqMessageFound = true;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    assert.ok(dlqMessageFound, "Poison message must be safely rejected to Dead Letter Queue (DLQ)");
  });

  it("should retry transient failures with incrementing x-retry-count header", async () => {
    const ch = await rabbit.connect();
    const testCommandId = randomUUID();
    const testVehicleId = `veh_retry_${Date.now()}`;

    // Command configured to fail transiently
    const commandEvent: CommandDispatchedEvent = {
      eventId: randomUUID(),
      eventType: "command.dispatched",
      timestamp: new Date().toISOString(),
      vehicleId: testVehicleId,
      deviceId: "obd_test_unit",
      version: "1.0.0",
      data: {
        commandId: testCommandId,
        commandType: "UNLOCK_DOORS",
        status: "DISPATCHED",
        timeoutSeconds: 30,
        parameters: { simulateTransientError: true },
      },
    };

    // Purge retry queue
    await ch.purgeQueue(RABBITMQ_QUEUES.COMMAND_RETRY);

    // Publish to command exchange (test 1 consumer will process and fail with simulateTransientError)

    // Publish to command exchange
    await rabbit.publish(
      RABBITMQ_EXCHANGES.COMMAND,
      "command.execute",
      commandEvent,
      {
        correlationId: testCommandId,
      }
    );

    // Verify message reaches retry queue with incremented retry count
    let retryMessageFound = false;
    for (let i = 0; i < 25; i++) {
      const msg = await ch.get(RABBITMQ_QUEUES.COMMAND_RETRY, { noAck: true });
      if (msg) {
        const body = JSON.parse(msg.content.toString());
        if (body.data?.commandId === testCommandId) {
          const retryCount = msg.properties.headers?.["x-retry-count"];
          assert.equal(retryCount, 1, "x-retry-count header must be 1 on first retry");
          retryMessageFound = true;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    assert.ok(retryMessageFound, "Failed job must be republished to TTL retry queue");
  });
});
