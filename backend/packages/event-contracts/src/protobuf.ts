import protobuf from "protobufjs";

/**
 * Inlined Proto definition for zero-dependency runtime parsing & testing
 */
export const TELEMETRY_PROTO_DEF = `
syntax = "proto3";

package vehiclepulse.telemetry;

message Location {
  double latitude = 1;
  double longitude = 2;
  double heading = 3;
  double altitudeMeters = 4;
}

message RawTelemetryV1 {
  string eventId = 1;
  string vehicleId = 2;
  string deviceId = 3;
  string timestamp = 4;
  Location location = 5;
  double speedKmh = 6;
  double fuelLevelPct = 7;
  double batteryLevelPct = 8;
  double engineTempC = 9;
  double odometerKm = 10;
}

message RawTelemetryV2 {
  string eventId = 1;
  string vehicleId = 2;
  string deviceId = 3;
  string timestamp = 4;
  Location location = 5;
  double speedKmh = 6;
  double fuelLevelPct = 7;
  double batteryLevelPct = 8;
  double engineTempC = 9;
  double odometerKm = 10;
  double tirePressurePsi = 11;
  double ambientTempC = 12;
}

message IncompatibleRawTelemetry {
  string eventId = 1;
  string vehicleId = 2;
  string speedKmh = 6;
}
`;

/**
 * Root schema container compiled from proto definitions
 */
export const protoRoot = protobuf.parse(TELEMETRY_PROTO_DEF).root;

export const RawTelemetryV1Type = protoRoot.lookupType("vehiclepulse.telemetry.RawTelemetryV1");
export const RawTelemetryV2Type = protoRoot.lookupType("vehiclepulse.telemetry.RawTelemetryV2");
export const IncompatibleType = protoRoot.lookupType("vehiclepulse.telemetry.IncompatibleRawTelemetry");

export interface RawTelemetryV1Message {
  eventId: string;
  vehicleId: string;
  deviceId: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    heading: number;
    altitudeMeters?: number;
  };
  speedKmh: number;
  fuelLevelPct: number;
  batteryLevelPct: number;
  engineTempC: number;
  odometerKm: number;
}

export interface RawTelemetryV2Message extends RawTelemetryV1Message {
  tirePressurePsi?: number;
  ambientTempC?: number;
}

/**
 * Serializes a RawTelemetryV1 payload to binary Protobuf buffer
 */
export function encodeTelemetryV1(payload: RawTelemetryV1Message): Uint8Array {
  const message = RawTelemetryV1Type.create({
    eventId: payload.eventId,
    vehicleId: payload.vehicleId,
    deviceId: payload.deviceId,
    timestamp: payload.timestamp,
    location: {
      latitude: payload.location.latitude,
      longitude: payload.location.longitude,
      heading: payload.location.heading,
      altitudeMeters: payload.location.altitudeMeters || 0,
    },
    speedKmh: payload.speedKmh,
    fuelLevelPct: payload.fuelLevelPct,
    batteryLevelPct: payload.batteryLevelPct,
    engineTempC: payload.engineTempC,
    odometerKm: payload.odometerKm,
  });
  return RawTelemetryV1Type.encode(message).finish();
}

/**
 * Decodes a binary buffer into RawTelemetryV1 object
 */
export function decodeTelemetryV1(buffer: Uint8Array): RawTelemetryV1Message {
  const decoded = RawTelemetryV1Type.toObject(RawTelemetryV1Type.decode(buffer), {
    defaults: true,
  }) as any;
  return {
    eventId: decoded.eventId,
    vehicleId: decoded.vehicleId,
    deviceId: decoded.deviceId,
    timestamp: decoded.timestamp,
    location: {
      latitude: decoded.location?.latitude ?? 0,
      longitude: decoded.location?.longitude ?? 0,
      heading: decoded.location?.heading ?? 0,
      altitudeMeters: decoded.location?.altitudeMeters ?? 0,
    },
    speedKmh: decoded.speedKmh ?? 0,
    fuelLevelPct: decoded.fuelLevelPct ?? 0,
    batteryLevelPct: decoded.batteryLevelPct ?? 0,
    engineTempC: decoded.engineTempC ?? 0,
    odometerKm: decoded.odometerKm ?? 0,
  };
}

/**
 * Serializes a RawTelemetryV2 payload to binary Protobuf buffer
 */
export function encodeTelemetryV2(payload: RawTelemetryV2Message): Uint8Array {
  const message = RawTelemetryV2Type.create({
    eventId: payload.eventId,
    vehicleId: payload.vehicleId,
    deviceId: payload.deviceId,
    timestamp: payload.timestamp,
    location: {
      latitude: payload.location.latitude,
      longitude: payload.location.longitude,
      heading: payload.location.heading,
      altitudeMeters: payload.location.altitudeMeters || 0,
    },
    speedKmh: payload.speedKmh,
    fuelLevelPct: payload.fuelLevelPct,
    batteryLevelPct: payload.batteryLevelPct,
    engineTempC: payload.engineTempC,
    odometerKm: payload.odometerKm,
    tirePressurePsi: payload.tirePressurePsi || 0,
    ambientTempC: payload.ambientTempC || 0,
  });
  return RawTelemetryV2Type.encode(message).finish();
}

/**
 * Decodes a binary buffer into RawTelemetryV2 object
 */
export function decodeTelemetryV2(buffer: Uint8Array): RawTelemetryV2Message {
  const decoded = RawTelemetryV2Type.toObject(RawTelemetryV2Type.decode(buffer), {
    defaults: true,
  }) as any;
  return {
    eventId: decoded.eventId,
    vehicleId: decoded.vehicleId,
    deviceId: decoded.deviceId,
    timestamp: decoded.timestamp,
    location: {
      latitude: decoded.location?.latitude ?? 0,
      longitude: decoded.location?.longitude ?? 0,
      heading: decoded.location?.heading ?? 0,
      altitudeMeters: decoded.location?.altitudeMeters ?? 0,
    },
    speedKmh: decoded.speedKmh ?? 0,
    fuelLevelPct: decoded.fuelLevelPct ?? 0,
    batteryLevelPct: decoded.batteryLevelPct ?? 0,
    engineTempC: decoded.engineTempC ?? 0,
    odometerKm: decoded.odometerKm ?? 0,
    tirePressurePsi: decoded.tirePressurePsi ?? 0,
    ambientTempC: decoded.ambientTempC ?? 0,
  };
}
