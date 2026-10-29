import { getPrismaClient } from "../../db/prisma.js";

const getActiveTrips = async (limit: number = 20) => {
  const prisma = getPrismaClient();

  const activeTrips = await prisma.$queryRaw<
    Array<{
      id: string;
      vehicleId: string;
      startTime: Date;
      distanceKm: number;
      avgSpeedKmh: number;
      maxSpeedKmh: number;
    }>
  >`
    SELECT id, "vehicleId", "startTime", "distanceKm", "avgSpeedKmh", "maxSpeedKmh"
    FROM vehicle_trips
    WHERE status = 'ACTIVE'
    ORDER BY "startTime" DESC
    LIMIT ${limit}
  `;

  return {
    count: activeTrips.length,
    trips: activeTrips,
  };
};

const getVehicleTrips = async (
  vehicleId: string,
  options: { status?: string; limit?: number }
) => {
  const prisma = getPrismaClient();
  const where: any = { vehicleId };

  if (options.status) {
    where.status = String(options.status).toUpperCase();
  }

  const trips = await prisma.vehicleTrip.findMany({
    where,
    orderBy: { startTime: "desc" },
    take: Math.min(options.limit || 20, 100),
  });

  return {
    vehicleId,
    count: trips.length,
    trips,
  };
};

export const TripService = {
  getActiveTrips,
  getVehicleTrips,
};
