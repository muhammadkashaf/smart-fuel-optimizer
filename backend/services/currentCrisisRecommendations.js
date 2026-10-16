import Trip from "../models/Trip.js";
import Vehicle from "../models/Vehicle.js";
import { buildCrisisRecommendations, pakistanToday } from "./crisisRecommendations.js";

export async function getCurrentCrisisRecommendations(userId) {
  const vehicles = await Vehicle.find({ userId })
    .select("_id vehicleName registrationNumber fuelType fuelEfficiency").lean();
  const today = pakistanToday();
  const trips = await Trip.find({
    userId,
    vehicleId: { $in: vehicles.map((vehicle) => vehicle._id) },
    status: "Planned",
    tripDate: { $gte: new Date(`${today}T00:00:00.000Z`) },
  }).select("_id vehicleId startLocation destination tripDate priority status startCoordinates destinationCoordinates selectedRoute")
    .sort({ tripDate: 1, _id: 1 }).lean();
  return buildCrisisRecommendations(trips, vehicles, today);
}
