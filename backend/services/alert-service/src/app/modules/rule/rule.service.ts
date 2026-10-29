import { getPrismaClient } from "../../db/prisma.js";
import { AppError } from "@vehicle-pulse/shared";

export interface CreateRuleInput {
  name: string;
  description?: string;
  conditionType: string;
  thresholdValue: number;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  enabled?: boolean;
  cooldownSecs?: number;
}

const listRules = async () => {
  const prisma = getPrismaClient();
  return await prisma.alertRule.findMany({
    orderBy: { createdAt: "desc" },
  });
};

const createRule = async (input: CreateRuleInput) => {
  const prisma = getPrismaClient();
  return await prisma.alertRule.create({
    data: {
      name: input.name,
      description: input.description,
      conditionType: input.conditionType,
      thresholdValue: input.thresholdValue,
      severity: input.severity || "MEDIUM",
      enabled: input.enabled !== undefined ? input.enabled : true,
      cooldownSecs: input.cooldownSecs || 300,
    },
  });
};

const getRuleById = async (id: string) => {
  const prisma = getPrismaClient();
  const rule = await prisma.alertRule.findUnique({ where: { id } });
  if (!rule) {
    throw new AppError("Alert rule not found", 404);
  }
  return rule;
};

export const RuleService = {
  listRules,
  createRule,
  getRuleById,
};
