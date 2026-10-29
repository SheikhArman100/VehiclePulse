import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createLogger } from "@vehicle-pulse/logger";
import { connectMySQL, disconnectMySQL } from "../app/db/prisma.js";
import { AlertService } from "../app/modules/alert/alert.service.js";
import { RuleService } from "../app/modules/rule/rule.service.js";

const testLogger = createLogger({ serviceName: "test-alert-p17", level: "silent" });

describe("Phase 17 — Alert Service Foundation & MySQL Suite", () => {
  before(async () => {
    await connectMySQL(testLogger);
  });

  after(async () => {
    await disconnectMySQL(testLogger);
  });

  it("should create an alert rule and persist to MySQL", async () => {
    const rule = await RuleService.createRule({
      name: "High Speed Alert Rule",
      conditionType: "SPEED_LIMIT",
      thresholdValue: 120,
      severity: "HIGH",
    });

    assert.ok(rule.id, "Rule should have an ID");
    assert.equal(rule.name, "High Speed Alert Rule");
    assert.equal(rule.thresholdValue, 120);
    assert.equal(rule.severity, "HIGH");
  });

  it("should create an alert with OPEN status and associated event", async () => {
    const vehicleId = `veh_alert_${Date.now()}`;
    const alert = await AlertService.createAlert({
      vehicleId,
      severity: "HIGH",
      triggerValue: 135.5,
      thresholdValue: 120.0,
      message: `Speed 135.5 km/h exceeded threshold 120.0 km/h`,
      latitude: 40.7128,
      longitude: -74.006,
    });

    assert.ok(alert.id);
    assert.equal(alert.status, "OPEN");
    assert.equal(alert.version, 1);
    assert.equal(alert.vehicleId, vehicleId);

    // Verify detail retrieval and events audit
    const details = await AlertService.getAlertById(alert.id);
    assert.equal(details.events.length, 1);
    assert.equal(details.events[0].value, 135.5);
  });

  it("should progress lifecycle: OPEN -> ACKNOWLEDGED -> RESOLVED", async () => {
    const vehicleId = `veh_lifecycle_${Date.now()}`;
    const alert = await AlertService.createAlert({
      vehicleId,
      severity: "CRITICAL",
      triggerValue: 115.0,
      thresholdValue: 110.0,
      message: "Engine temperature critical",
    });

    // 1. Acknowledge
    const acknowledged = await AlertService.acknowledgeAlert(alert.id, {
      acknowledgedBy: "operator_alex",
    });
    assert.equal(acknowledged?.status, "ACKNOWLEDGED");
    assert.equal(acknowledged?.acknowledgedBy, "operator_alex");
    assert.equal(acknowledged?.version, 2);

    // 2. Resolve
    const resolved = await AlertService.resolveAlert(alert.id, {
      resolvedBy: "technician_dave",
      resolutionNote: "Coolant refilled and temperature normalized",
    });
    assert.equal(resolved?.status, "RESOLVED");
    assert.equal(resolved?.resolvedBy, "technician_dave");
    assert.equal(resolved?.version, 3);
  });

  it("should reject invalid lifecycle transitions", async () => {
    const vehicleId = `veh_invalid_${Date.now()}`;
    const alert = await AlertService.createAlert({
      vehicleId,
      severity: "MEDIUM",
      triggerValue: 11.2,
      thresholdValue: 11.5,
      message: "Low battery voltage",
    });

    // Acknowledge first
    await AlertService.acknowledgeAlert(alert.id, { acknowledgedBy: "op_1" });

    // Attempting to acknowledge again must be rejected
    await assert.rejects(
      async () => {
        await AlertService.acknowledgeAlert(alert.id, { acknowledgedBy: "op_2" });
      },
      (err: any) => {
        assert.match(err.message, /Invalid lifecycle transition/);
        return true;
      }
    );
  });

  it("should prevent concurrent write race conditions with optimistic locking", async () => {
    const vehicleId = `veh_concurrent_${Date.now()}`;
    const alert = await AlertService.createAlert({
      vehicleId,
      severity: "HIGH",
      triggerValue: 95.0,
      thresholdValue: 80.0,
      message: "Harsh braking event",
    });

    // Simulate two concurrent operators acknowledging the exact same alert
    const results = await Promise.allSettled([
      AlertService.acknowledgeAlert(alert.id, { acknowledgedBy: "operator_1" }),
      AlertService.acknowledgeAlert(alert.id, { acknowledgedBy: "operator_2" }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Exactly one concurrent transition should succeed");
    assert.equal(rejected.length, 1, "The second concurrent transition should be rejected due to conflict");
  });
});
