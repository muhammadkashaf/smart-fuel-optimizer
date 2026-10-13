import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: Number, required: true, min: 1, max: 12, validate: Number.isInteger },
    year: { type: Number, required: true, min: 2000, max: 2100, validate: Number.isInteger },
    amount: { type: Number, required: true, min: [Number.MIN_VALUE, "Budget amount must be greater than 0"] },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model("Budget", budgetSchema);
