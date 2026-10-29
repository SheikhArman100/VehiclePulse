import { getPrismaClient } from "../../db/prisma.js";
import { AppError } from "@vehicle-pulse/shared";

export interface ListAlertsFilter {
  vehicleId?: string;
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  limit?: number;
  offset?: number;
}

export interface CreateAlertInput {
  vehicleId: string;
  ruleId?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  triggerValue: number;
  thresholdValue: number;
  message: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

export interface AcknowledgeAlertInput {
  acknowledgedBy: string;
}

export interface ResolveAlertInput {
  resolvedBy: string;
  resolutionNote?: string;
}

const listAlerts = async (filter: ListAlertsFilter) => {
  const prisma = getPrismaClient();
  const limit = Math.min(Math.max(filter.limit || 50, 1), 200);
  const offset = Math.max(filter.offset || 0, 0);

  const where: any = {};
  if (filter.vehicleId) where.vehicleId = filter.vehicleId;
  if (filter.status) where.status = filter.status;
  if (filter.severity) where.severity = filter.severity;

  const [total, alerts] = await Promise.all([
    prisma.alert.count({ where }),
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        rule: true,
        events: {
          orderBy: { triggeredAt: "desc" },
          take: 5,
        },
      },
    }),
  ]);

  return {
    total,
    limit,
    offset,
    alerts,
  };
};

const getAlertById = async (id: string) => {
  const prisma = getPrismaClient();
  const alert = await prisma.alert.findUnique({
    where: { id },
    include: {
      rule: true,
      incident: true,
      events: {
        orderBy: { triggeredAt: "desc" },
      },
    },
  });

  if (!alert) {
    throw new AppError("Alert not found", 404);
  }

  return alert;
};

const createAlert = async (input: CreateAlertInput) => {
  const prisma = getPrismaClient();

  return await prisma.$transaction(async (tx) => {
    const alert = await tx.alert.create({
      data: {
        vehicleId: input.vehicleId,
        ruleId: input.ruleId,
        severity: input.severity,
        status: "OPEN",
        triggerValue: input.triggerValue,
        thresholdValue: input.thresholdValue,
        message: input.message,
      },
    });

    await tx.alertEvent.create({
      data: {
        alertId: alert.id,
        vehicleId: input.vehicleId,
        eventType: "ALERT_TRIGGERED",
        value: input.triggerValue,
        latitude: input.latitude,
        longitude: input.longitude,
        metadata: input.metadata as any,
      },
    });

    return alert;
  });
};

const acknowledgeAlert = async (id: string, input: AcknowledgeAlertInput) => {
  const prisma = getPrismaClient();

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.alert.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Alert not found", 404);
    }

    if (existing.status !== "OPEN") {
      throw new AppError(
        `Invalid lifecycle transition: Cannot acknowledge alert in '${existing.status}' status (must be OPEN)`,
        400
      );
    }

    // Optimistic Concurrency Control using version field
    const updated = await tx.alert.updateMany({
      where: {
        id,
        version: existing.version,
      },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        acknowledgedBy: input.acknowledgedBy,
        version: existing.version + 1,
      },
    });

    if (updated.count === 0) {
      throw new AppError("Conflict: Alert was modified concurrently by another transaction", 409);
    }

    return await tx.alert.findUnique({ where: { id } });
  });
};

const resolveAlert = async (id: string, input: ResolveAlertInput) => {
  const prisma = getPrismaClient();

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.alert.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Alert not found", 404);
    }

    if (existing.status === "RESOLVED") {
      throw new AppError("Invalid lifecycle transition: Alert is already RESOLVED", 400);
    }

    // Optimistic Concurrency Control using version field
    const updated = await tx.alert.updateMany({
      where: {
        id,
        version: existing.version,
      },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy: input.resolvedBy,
        resolutionNote: input.resolutionNote,
        version: existing.version + 1,
      },
    });

    if (updated.count === 0) {
      throw new AppError("Conflict: Alert was modified concurrently by another transaction", 409);
    }

    return await tx.alert.findUnique({ where: { id } });
  });
};

export const AlertService = {
  listAlerts,
  getAlertById,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
};
