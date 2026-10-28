export type IVehicleStatus = "active" | "inactive" | "maintenance";

export type IVehicle = {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  status: IVehicleStatus;
};
