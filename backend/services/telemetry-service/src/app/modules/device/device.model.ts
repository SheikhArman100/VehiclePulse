import { Schema, model } from "mongoose";
import { type IDevice, deviceStatusEnum } from "./device.interface.js";

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    serialNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    firmwareVersion: { type: String, default: "v1.0.0" },
    status: {
      type: String,
      enum: deviceStatusEnum,
      default: "unpaired",
      index: true,
    },
    vehicleId: { type: String, trim: true, index: true },
    lastHeartbeat: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Device = model<IDevice>("Device", DeviceSchema);
