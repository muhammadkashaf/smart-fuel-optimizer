import mongoose from "mongoose";

export const tripPriorities = ["Essential", "Normal", "Non-essential"];
export const tripStatuses = ["Planned", "Completed", "Cancelled"];

const coordinatesSchema = new mongoose.Schema({
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
}, { _id: false });

const selectedRouteSchema = new mongoose.Schema({
  distanceKm: { type: Number, required: true, min: 0 },
  durationMinutes: { type: Number, required: true, min: 0 },
  estimatedResource: { type: Number, required: true, min: 0 },
  resourceUnit: { type: String, enum: ["L", "kWh"], required: true },
  calculatedAt: { type: Date, required: true },
  plannedAt: { type: Date, required: true },
  fuelEfficiency: { type: Number, required: true, min: 0 },
  fuelType: { type: String, enum: ["Petrol", "Diesel", "Electric"], required: true },
  // Optional comparison snapshot. Older saved routes remain readable.
  wasLowestConsumption: { type: Boolean },
  bestAvailableEstimatedResource: { type: Number, min: 0 },
}, { _id: false });

const tripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    startLocation: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    tripDate: { type: Date, required: true },
    priority: { type: String, enum: tripPriorities, default: "Normal" },
    purpose: { type: String, trim: true, default: "" },
    status: { type: String, enum: tripStatuses, default: "Planned" },
    startCoordinates: { type: coordinatesSchema, default: undefined },
    destinationCoordinates: { type: coordinatesSchema, default: undefined },
    selectedRoute: { type: selectedRouteSchema, default: undefined },
  },
  { timestamps: true }
);

tripSchema.index({ userId: 1, tripDate: -1 });
tripSchema.index({ userId: 1, vehicleId: 1, tripDate: -1 });

export default mongoose.model("Trip", tripSchema);
