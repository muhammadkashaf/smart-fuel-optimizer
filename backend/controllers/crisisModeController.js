import User from "../models/User.js";
import Trip from "../models/Trip.js";
import Vehicle from "../models/Vehicle.js";
import { buildCrisisRecommendations, pakistanToday } from "../services/crisisRecommendations.js";

export const getCrisisMode = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("crisisModeEnabled");
    if (!user) return res.status(401).json({ message: "We could not verify your account" });
    return res.json({ enabled: user.crisisModeEnabled === true });
  } catch (error) { return next(error); }
};

export const updateCrisisMode = async (req, res, next) => {
  if (typeof req.body?.enabled !== "boolean") {
    return res.status(400).json({ message: "Enabled must be true or false" });
  }
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, role: { $in: ["Individual", "Organizational"] } },
      { $set: { crisisModeEnabled: req.body.enabled } },
      { new: true, runValidators: true },
    ).select("crisisModeEnabled");
    if (!user) return res.status(401).json({ message: "We could not verify your account" });
    return res.json({ enabled: user.crisisModeEnabled, message: user.crisisModeEnabled ? "Crisis Mode enabled" : "Crisis Mode disabled" });
  } catch (error) { return next(error); }
};

export const getRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("crisisModeEnabled");
    if (!user) return res.status(401).json({ message: "We could not verify your account" });
    if (!user.crisisModeEnabled) return res.json({ enabled: false, summary: null, recommendations: [] });

    const vehicles = await Vehicle.find({ userId: req.user._id })
      .select("_id vehicleName registrationNumber fuelType fuelEfficiency").lean();
    const today = pakistanToday();
    const trips = await Trip.find({
      userId: req.user._id,
      vehicleId: { $in: vehicles.map((vehicle) => vehicle._id) },
      status: "Planned",
      tripDate: { $gte: new Date(`${today}T00:00:00.000Z`) },
    }).select("_id vehicleId startLocation destination tripDate priority status startCoordinates destinationCoordinates selectedRoute")
      .sort({ tripDate: 1, _id: 1 }).lean();
    return res.json({ enabled: true, ...buildCrisisRecommendations(trips, vehicles, today) });
  } catch (error) { return next(error); }
};
