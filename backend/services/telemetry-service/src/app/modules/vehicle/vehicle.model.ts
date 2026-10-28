import { Schema, model } from "mongoose";
import { type IVehicle, vehicleStatusEnum } from "./vehicle.interface.js";

const VehicleSchema = new Schema<IVehicle>(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    vin: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    licensePlate: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: vehicleStatusEnum,
      default: "active",
      index: true,
    },
    deviceId: { type: String, trim: true, index: true },
    fuelType: {
      type: String,
      enum: ["gasoline", "diesel", "electric", "hybrid"],
      default: "electric",
    },
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

// Compound text search index for fleet searching
VehicleSchema.index({ make: "text", model: "text", licensePlate: "text" });

export const Vehicle = model<IVehicle>("Vehicle", VehicleSchema);
