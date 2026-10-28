import { randomUUID } from "node:crypto";
import type { TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import { SeededRandom } from "./utils/random.js";

export type DrivingState = "STOPPED" | "ACCELERATING" | "CRUISING" | "BRAKING" | "IDLING";

export interface VehicleSimState {
  vehicleId: string;
  deviceId: string;
  vin: string;
  drivingState: DrivingState;
  latitude: number;
  longitude: number;
  heading: number;
  altitude: number;
  speed: number;
  rpm: number;
  fuelLevelPercent: number;
  engineTemperatureCelsius: number;
  batteryVoltage: number;
  odometerKm: number;
  engineStatus: "ON" | "OFF" | "IDLE";
  accelerationG: number;
  online: boolean;
}

export class StatefulVehicleModel {
  private state: VehicleSimState;
  private rng: SeededRandom;

  constructor(
    vehicleId: string,
    deviceId: string,
    vin: string,
    seed: number,
    initialCoords: [number, number] = [-122.4194, 37.7749]
  ) {
    this.rng = new SeededRandom(seed);
    this.state = {
      vehicleId,
      deviceId,
      vin,
      drivingState: "IDLING",
      latitude: initialCoords[1],
      longitude: initialCoords[0],
      heading: this.rng.range(0, 360),
      altitude: this.rng.range(10, 50),
      speed: 0,
      rpm: 850,
      fuelLevelPercent: this.rng.range(60, 95),
      engineTemperatureCelsius: this.rng.range(75, 85),
      batteryVoltage: 13.8,
      odometerKm: this.rng.range(5000, 50000),
      engineStatus: "ON",
      accelerationG: 0,
      online: true,
    };
  }

  getState(): Readonly<VehicleSimState> {
    return { ...this.state };
  }

  /**
   * Advance vehicle simulation by dtSeconds.
   */
  tick(dtSeconds = 1): TelemetryRawEvent {
    // 1. Simulate state transitions
    this.transitionState();

    // 2. Physics & dynamic updates based on drivingState
    switch (this.state.drivingState) {
      case "ACCELERATING":
        this.state.accelerationG = this.rng.range(0.1, 0.4);
        this.state.speed = Math.min(130, this.state.speed + this.state.accelerationG * 9.8 * dtSeconds * 3.6);
        this.state.rpm = Math.min(4800, 1000 + this.state.speed * 32);
        this.state.engineStatus = "ON";
        this.state.engineTemperatureCelsius = Math.min(105, this.state.engineTemperatureCelsius + 0.05 * dtSeconds);
        this.state.fuelLevelPercent = Math.max(0, this.state.fuelLevelPercent - 0.003 * dtSeconds);
        break;

      case "CRUISING":
        this.state.accelerationG = this.rng.range(-0.03, 0.03);
        this.state.speed = Math.max(40, Math.min(125, this.state.speed + this.state.accelerationG * 5));
        this.state.rpm = 1200 + this.state.speed * 20;
        this.state.engineStatus = "ON";
        this.state.fuelLevelPercent = Math.max(0, this.state.fuelLevelPercent - 0.0015 * dtSeconds);
        break;

      case "BRAKING":
        this.state.accelerationG = this.rng.range(-0.5, -0.15);
        this.state.speed = Math.max(0, this.state.speed + this.state.accelerationG * 9.8 * dtSeconds * 3.6);
        this.state.rpm = Math.max(850, this.state.rpm - 150 * dtSeconds);
        this.state.engineStatus = "ON";
        break;

      case "IDLING":
        this.state.accelerationG = 0;
        this.state.speed = 0;
        this.state.rpm = this.rng.range(800, 900);
        this.state.engineStatus = "IDLE";
        this.state.engineTemperatureCelsius = Math.max(82, this.state.engineTemperatureCelsius - 0.02 * dtSeconds);
        this.state.fuelLevelPercent = Math.max(0, this.state.fuelLevelPercent - 0.0004 * dtSeconds);
        break;

      case "STOPPED":
        this.state.accelerationG = 0;
        this.state.speed = 0;
        this.state.rpm = 0;
        this.state.engineStatus = "OFF";
        this.state.batteryVoltage = 12.4;
        this.state.engineTemperatureCelsius = Math.max(25, this.state.engineTemperatureCelsius - 0.1 * dtSeconds);
        break;
    }

    // 3. Movement kinematics (Great-circle / WGS84 displacement)
    if (this.state.speed > 0) {
      // Heading wander: smooth curvature
      const headingJitter = this.rng.range(-3, 3);
      this.state.heading = (this.state.heading + headingJitter + 360) % 360;

      // Distance in km traveled in this tick
      const distanceKm = (this.state.speed * dtSeconds) / 3600;
      this.state.odometerKm += distanceKm;

      // Coordinate shift (approx 1 deg lat = 111km, 1 deg lng = 111km * cos(lat))
      const radHeading = (this.state.heading * Math.PI) / 180;
      const dLat = (Math.cos(radHeading) * distanceKm) / 111;
      const dLng = (Math.sin(radHeading) * distanceKm) / (111 * Math.cos((this.state.latitude * Math.PI) / 180));

      this.state.latitude = Math.max(-85, Math.min(85, this.state.latitude + dLat));
      this.state.longitude = ((((this.state.longitude + dLng + 180) % 360) + 360) % 360) - 180;
    }

    // 4. Occasional connectivity flickers (online/offline state)
    if (this.rng.chance(0.005)) {
      this.state.online = !this.state.online;
    } else {
      this.state.online = true;
    }

    // 5. Construct canonical TelemetryRawEvent
    const now = new Date();
    const event: TelemetryRawEvent = {
      eventId: randomUUID(),
      eventType: "telemetry.raw",
      version: "1.0.0",
      vehicleId: this.state.vehicleId,
      deviceId: this.state.deviceId,
      timestamp: now.toISOString(),
      data: {
        location: {
          latitude: Number(this.state.latitude.toFixed(6)),
          longitude: Number(this.state.longitude.toFixed(6)),
          heading: Number(this.state.heading.toFixed(2)),
          altitude: Number(this.state.altitude.toFixed(1)),
        },
        speed: Number(this.state.speed.toFixed(1)),
        rpm: Math.round(this.state.rpm),
        fuelLevelPercent: Number(this.state.fuelLevelPercent.toFixed(2)),
        engineTemperatureCelsius: Number(this.state.engineTemperatureCelsius.toFixed(1)),
        batteryVoltage: Number(this.state.batteryVoltage.toFixed(2)),
        odometerKm: Number(this.state.odometerKm.toFixed(2)),
        engineStatus: this.state.engineStatus,
        accelerationG: Number(this.state.accelerationG.toFixed(3)),
      },
    };

    return event;
  }

  private transitionState(): void {
    const current = this.state.drivingState;

    // Plausible state machine transitions
    if (current === "STOPPED") {
      if (this.rng.chance(0.2)) this.state.drivingState = "IDLING";
    } else if (current === "IDLING") {
      if (this.rng.chance(0.4)) this.state.drivingState = "ACCELERATING";
      else if (this.rng.chance(0.05)) this.state.drivingState = "STOPPED";
    } else if (current === "ACCELERATING") {
      if (this.state.speed > 80 || this.rng.chance(0.3)) this.state.drivingState = "CRUISING";
      else if (this.rng.chance(0.1)) this.state.drivingState = "BRAKING";
    } else if (current === "CRUISING") {
      if (this.rng.chance(0.15)) this.state.drivingState = "ACCELERATING";
      else if (this.rng.chance(0.2)) this.state.drivingState = "BRAKING";
    } else if (current === "BRAKING") {
      if (this.state.speed <= 2) this.state.drivingState = "IDLING";
      else if (this.rng.chance(0.3)) this.state.drivingState = "CRUISING";
    }
  }
}
