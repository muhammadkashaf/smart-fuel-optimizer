import mongoose from "mongoose";

const fuelRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [Number.MIN_VALUE, "Quantity must be greater than 0"],
    },
    cost: {
      type: Number,
      required: true,
      min: [0, "Cost must be zero or greater"],
    },
  },
  { timestamps: true }
);

fuelRecordSchema.index({ userId: 1, vehicleId: 1, date: -1 });

export default mongoose.model("FuelRecord", fuelRecordSchema);
