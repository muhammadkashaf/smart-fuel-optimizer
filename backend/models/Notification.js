import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["BUDGET_EXCEEDED", "INEFFICIENT_TRIP", "CRISIS_RECOMMENDATION"], required: true },
  severity: { type: String, enum: ["HIGH", "MEDIUM", "INFO"], required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  relatedEntityType: { type: String, enum: ["Budget", "Trip", "CrisisRecommendation"] },
  relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
  relatedTripIds: [{ type: mongoose.Schema.Types.ObjectId }],
  actionPath: { type: String, default: "" },
  dedupeKey: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date, default: null },
  lastTriggeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ userId: 1, lastTriggeredAt: -1, _id: -1 });

export default mongoose.model("Notification", notificationSchema);
