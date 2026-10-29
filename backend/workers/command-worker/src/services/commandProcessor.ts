import type { CommandDispatchedEvent } from "@vehicle-pulse/event-contracts";
import type { Logger } from "@vehicle-pulse/logger";

export interface CommandExecutionResult {
  commandId: string;
  vehicleId: string;
  commandType: string;
  status: "COMPLETED" | "FAILED";
  executedAt: string;
  details: string;
}

/**
 * Pure Command Processor & Device Simulator
 * Executes vehicle commands (LOCK_DOORS, START_ENGINE, HONK_HORN, etc.)
 * Simulates real hardware execution delays and responses.
 */
export class CommandProcessor {
  public static async execute(
    event: CommandDispatchedEvent,
    logger: Logger
  ): Promise<CommandExecutionResult> {
    const { commandId, commandType } = event.data;
    const vehicleId = event.vehicleId;

    logger.info(
      { commandId, vehicleId, commandType },
      `Executing vehicle command: ${commandType}`
    );

    // Simulate transient hardware communication error for simulated test triggers
    if (event.data.parameters?.simulateTransientError === true) {
      throw new Error(`Transient CAN bus timeout communicating with vehicle ${vehicleId}`);
    }

    // Simulate device latency (50ms)
    await new Promise((r) => setTimeout(r, 50));

    let details = "";
    switch (commandType) {
      case "LOCK_DOORS":
        details = `Vehicle ${vehicleId} doors locked successfully`;
        break;
      case "UNLOCK_DOORS":
        details = `Vehicle ${vehicleId} doors unlocked successfully`;
        break;
      case "START_ENGINE":
        details = `Vehicle ${vehicleId} remote engine start sequence executed`;
        break;
      case "STOP_ENGINE":
        details = `Vehicle ${vehicleId} remote engine shutdown sequence executed`;
        break;
      case "HONK_HORN":
        details = `Vehicle ${vehicleId} horn honked 3 times`;
        break;
      case "FLASH_LIGHTS":
        details = `Vehicle ${vehicleId} hazard lights flashed 5 times`;
        break;
      case "SET_SPEED_LIMIT":
        details = `Vehicle ${vehicleId} speed limiter updated to ${event.data.parameters?.speedLimit || 120} km/h`;
        break;
      default:
        details = `Command ${commandType} executed`;
    }

    logger.info({ commandId, vehicleId, commandType }, details);

    return {
      commandId,
      vehicleId,
      commandType,
      status: "COMPLETED",
      executedAt: new Date().toISOString(),
      details,
    };
  }
}
