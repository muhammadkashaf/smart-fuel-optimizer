import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["Individual", "Organizational", "Admin"],
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    // Legacy accounts have no flag and remain verified; new registrations set false explicitly.
    emailVerified: { type: Boolean, default: true },
    emailVerificationOtpHash: { type: String, select: false },
    emailVerificationOtpExpiresAt: { type: Date, select: false },
    emailVerificationOtpAttempts: { type: Number, select: false },
    emailVerificationOtpSentAt: { type: Date, select: false },
    passwordResetOtpHash: { type: String, select: false },
    passwordResetOtpExpiresAt: { type: Date, select: false },
    passwordResetOtpAttempts: { type: Number, select: false },
    passwordResetOtpSentAt: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
    crisisModeEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
