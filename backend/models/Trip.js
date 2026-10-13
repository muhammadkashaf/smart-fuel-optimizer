import mongoose from "mongoose";

export const tripPriorities = ["Essential", "Normal", "Non-essential"];
export const tripStatuses = ["Planned", "Completed", "Cancelled"];

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
  },
  { timestamps: true }
);

tripSchema.index({ userId: 1, tripDate: -1 });
tripSchema.index({ userId: 1, vehicleId: 1, tripDate: -1 });

export default mongoose.model("Trip", tripSchema);
