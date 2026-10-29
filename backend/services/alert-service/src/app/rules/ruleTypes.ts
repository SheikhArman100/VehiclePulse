
export type RuleConditionType =
  | "SPEED_LIMIT"
  | "ENGINE_TEMP"
  | "BATTERY_VOLTAGE"
  | "HARSH_BRAKING"
  | "EXTREME_ACCELERATION"
  | "LOW_FUEL";

export type RuleSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface EvaluatedRule {
  id: string;
  name: string;
  conditionType: RuleConditionType;
  thresholdValue: number;
  severity: RuleSeverity;
  enabled: boolean;
  cooldownSecs: number;
}

export interface RuleViolation {
  ruleId?: string;
  ruleName: string;
  conditionType: RuleConditionType;
  severity: RuleSeverity;
  triggerValue: number;
  thresholdValue: number;
  message: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  deduplicationKey: string;
  cooldownSecs: number;
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  vehicleId: string;
  eventId: string;
  timestamp: string;
  hasViolations: boolean;
  violations: RuleViolation[];
}
