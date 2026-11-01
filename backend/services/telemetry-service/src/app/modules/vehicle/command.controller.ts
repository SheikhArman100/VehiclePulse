import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { catchAsync, sendResponse, RabbitMQClient, RABBITMQ_EXCHANGES, AppError } from "@vehicle-pulse/shared";
import {
  type CommandDispatchedEvent,
  CommandTypeEnum,
} from "@vehicle-pulse/event-contracts";
import { z } from "zod";
import { env } from "../../../config/env.js";
import { getLockService } from "../../kafka/redisStateConsumer.js";

let rabbitClient: RabbitMQClient | null = null;

const getRabbitClient = (): RabbitMQClient => {
  if (!rabbitClient) {
    const rawUrl = env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
    const resolvedUrl =
      rawUrl.includes("@rabbitmq:") && !process.env.RUNNING_IN_DOCKER
        ? rawUrl.replace("@rabbitmq:", "@localhost:")
        : rawUrl;

    rabbitClient = new RabbitMQClient({
      url: resolvedUrl,
      logger: (globalThis as any).logger || console,
    });
  }
  return rabbitClient;
};

export const DispatchCommandValidation = z.object({
  body: z.object({
    commandType: CommandTypeEnum,
    parameters: z.record(z.unknown()).optional(),
    timeoutSeconds: z.number().int().min(1).max(300).default(30),
  }),
});

export const dispatchVehicleCommand = catchAsync(async (req: Request, res: Response) => {
  const vehicleId = req.params.id;
  const { commandType, parameters, timeoutSeconds } = req.body;
  const commandId = randomUUID();

  // 1. Acquire Distributed Lock (Redlock mutex) per vehicle (Phase 23)
  // Ensures only one command can be actively dispatched/processed on this vehicle at a time
  const lockService = getLockService();
  let lockHandle = null;

  if (lockService) {
    lockHandle = await lockService.acquire(`vehicle:${vehicleId}:command`, {
      ttlMs: 3000, // 3-second lock window prevents rapid command flooding
      retryCount: 0, // Fail fast on concurrent command race
    });

    if (!lockHandle) {
      throw new AppError(
        `Vehicle '${vehicleId}' is currently busy executing another active command. Please retry in a few seconds.`,
        409
      );
    }
  }

  try {
    const commandEvent: CommandDispatchedEvent = {
      eventId: randomUUID(),
      eventType: "command.dispatched",
      timestamp: new Date().toISOString(),
      vehicleId,
      deviceId: req.body.deviceId || "obd_unit_default",
      version: "1.0.0",
      data: {
        commandId,
        commandType,
        status: "DISPATCHED",
        parameters,
        timeoutSeconds,
        dispatchedAt: new Date().toISOString(),
      },
    };

    const rabbit = getRabbitClient();
    await rabbit.publish(
      RABBITMQ_EXCHANGES.COMMAND,
      "command.execute",
      commandEvent,
      {
        correlationId: commandId,
        messageId: commandEvent.eventId,
      }
    );

    sendResponse(res, {
      statusCode: 202,
      success: true,
      message: `Command ${commandType} dispatched to vehicle ${vehicleId} asynchronously via RabbitMQ`,
      data: {
        commandId,
        vehicleId,
        commandType,
        status: "DISPATCHED",
        routingKey: "command.execute",
        exchange: RABBITMQ_EXCHANGES.COMMAND,
      },
    });
  } finally {
    // Release the distributed lock safely (atomic Lua script verifies token ownership)
    if (lockService && lockHandle) {
      await lockService.release(lockHandle);
    }
  }
});

