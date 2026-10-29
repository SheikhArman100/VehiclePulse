import type { PrismaClient } from "../../generated/client.js";
import type { TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import type { Logger } from "@vehicle-pulse/logger";
import { AlertRulesEngine } from "../rules/rulesEngine.js";
import { DEFAULT_RULES } from "../rules/defaultRules.js";
import type { EvaluatedRule, RuleViolation } from "../rules/ruleTypes.js";

// In-memory rule cache to prevent querying MySQL on every telemetry event
let cachedRules: EvaluatedRule[] | null = null;
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 60000; // Refresh rules from MySQL every 60s

export const getActiveRules = async (prisma: PrismaClient): Promise<EvaluatedRule[]> => {
  const now = Date.now();
  if (cachedRules && now - lastCacheRefresh < CACHE_TTL_MS) {
    return cachedRules;
  }

  try {
    const dbRules = await prisma.alertRule.findMany({
      where: { enabled: true },
    });

    if (dbRules.length > 0) {
      // Map to unique conditionTypes (most recent rule wins)
      const ruleMap = new Map<string, EvaluatedRule>();
      for (const r of dbRules) {
        if (!ruleMap.has(r.conditionType)) {
          ruleMap.set(r.conditionType, {
            id: r.id,
            name: r.name,
            conditionType: r.conditionType as any,
            thresholdValue: r.thresholdValue,
            severity: r.severity as any,
            enabled: r.enabled,
            cooldownSecs: r.cooldownSecs,
          });
        }
      }
      cachedRules = Array.from(ruleMap.values());
    } else {
      cachedRules = DEFAULT_RULES;
    }
  } catch {
    cachedRules = DEFAULT_RULES;
  }

  lastCacheRefresh = now;
  return cachedRules;
};

/**
 * Process a Telemetry Event:
 * 1. Evaluate pure rules
 * 2. Deduplicate using active alert cooldown window
 * 3. Persist Alert and AlertEvent inside an ACID transaction
 */
export const evaluateAndPersistTelemetryAlerts = async (
  prisma: PrismaClient,
  event: TelemetryRawEvent,
  logger: Logger
): Promise<number> => {
  const rules = await getActiveRules(prisma);
  const result = AlertRulesEngine.evaluate(event, rules);

  if (!result.hasViolations) {
    return 0;
  }

  let createdOrUpdatedCount = 0;

  for (const violation of result.violations) {
    try {
      await processSingleViolation(prisma, event.vehicleId, violation, logger);
      createdOrUpdatedCount++;
    } catch (err) {
      logger.error({ err, violation }, "Failed to process single alert violation");
    }
  }

  return createdOrUpdatedCount;
};

/**
 * Handles deduplication:
 * If an active OPEN or ACKNOWLEDGED alert exists within cooldownSecs,
 * appends an AlertEvent rather than opening a duplicate alert ticket.
 */
async function processSingleViolation(
  prisma: PrismaClient,
  vehicleId: string,
  violation: RuleViolation,
  logger: Logger
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Look for an existing open or acknowledged alert for this vehicle and condition/severity
    let existingActiveAlert = null;
    if (violation.ruleId && !violation.ruleId.startsWith("default-rule-")) {
      existingActiveAlert = await tx.alert.findFirst({
        where: {
          vehicleId,
          ruleId: violation.ruleId,
          status: { in: ["OPEN", "ACKNOWLEDGED"] },
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!existingActiveAlert) {
      existingActiveAlert = await tx.alert.findFirst({
        where: {
          vehicleId,
          severity: violation.severity,
          status: { in: ["OPEN", "ACKNOWLEDGED"] },
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (existingActiveAlert) {
      // Cooldown active: Update alert timestamp and append audit event
      await tx.alert.update({
        where: { id: existingActiveAlert.id },
        data: {
          triggerValue: violation.triggerValue,
          updatedAt: new Date(violation.timestamp),
        },
      });

      await tx.alertEvent.create({
        data: {
          alertId: existingActiveAlert.id,
          vehicleId,
          eventType: "ALERT_COOLDOWN_TRIGGER",
          value: violation.triggerValue,
          latitude: violation.latitude,
          longitude: violation.longitude,
          triggeredAt: new Date(violation.timestamp),
        },
      });

      logger.debug(
        { alertId: existingActiveAlert.id, condition: violation.conditionType },
        "Appended event to existing alert within cooldown"
      );
    } else {
      // Cooldown expired or first occurrence: Create a new alert
      let validRuleId: string | undefined = undefined;
      if (violation.ruleId && !violation.ruleId.startsWith("default-rule-")) {
        validRuleId = violation.ruleId;
      }

      const newAlert = await tx.alert.create({
        data: {
          vehicleId,
          ruleId: validRuleId,
          severity: violation.severity,
          status: "OPEN",
          triggerValue: violation.triggerValue,
          thresholdValue: violation.thresholdValue,
          message: violation.message,
          createdAt: new Date(violation.timestamp),
          updatedAt: new Date(violation.timestamp),
        },
      });

      await tx.alertEvent.create({
        data: {
          alertId: newAlert.id,
          vehicleId,
          eventType: "ALERT_TRIGGERED",
          value: violation.triggerValue,
          latitude: violation.latitude,
          longitude: violation.longitude,
          triggeredAt: new Date(violation.timestamp),
        },
      });

      logger.info(
        { alertId: newAlert.id, vehicleId, severity: violation.severity },
        `New alert triggered: ${violation.message}`
      );
    }
  });
}
