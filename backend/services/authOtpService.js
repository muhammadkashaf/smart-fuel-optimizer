import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import User from "../models/User.js";
import { sendOtpEmail } from "./emailService.js";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

const purposeFields = {
  verification: {
    hash: "emailVerificationOtpHash",
    expires: "emailVerificationOtpExpiresAt",
    attempts: "emailVerificationOtpAttempts",
    sent: "emailVerificationOtpSentAt",
  },
  reset: {
    hash: "passwordResetOtpHash",
    expires: "passwordResetOtpExpiresAt",
    attempts: "passwordResetOtpAttempts",
    sent: "passwordResetOtpSentAt",
  },
};

export const otpFields = (purpose) => purposeFields[purpose];
export const validOtp = (value) => typeof value === "string" && /^\d{6}$/.test(value);
const digest = (userId, purpose, code) => createHmac("sha256", process.env.JWT_SECRET)
  .update(`${purpose}:${userId}:${code}`).digest();

export const matchesOtp = (userId, purpose, code, storedHash) => {
  if (!validOtp(code) || typeof storedHash !== "string" || !/^[a-f\d]{64}$/i.test(storedHash)) return false;
  return timingSafeEqual(digest(userId, purpose, code), Buffer.from(storedHash, "hex"));
};

export const clearOtp = (purpose) => {
  const fields = otpFields(purpose);
  return Object.fromEntries(Object.values(fields).map((field) => [field, 1]));
};

export async function issueOtp(user, purpose) {
  const fields = otpFields(purpose);
  const now = new Date();
  const previous = await User.findById(user._id).select(`+${fields.hash}`);
  let code;
  let hash;
  do {
    code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    hash = digest(user._id, purpose, code).toString("hex");
  } while (hash === previous?.[fields.hash]);
  const filter = {
    _id: user._id,
    ...(purpose === "verification" ? { emailVerified: false } : {}),
    $or: [
      { [fields.sent]: { $exists: false } },
      { [fields.sent]: { $lte: new Date(now.getTime() - OTP_COOLDOWN_MS) } },
    ],
  };
  const updated = await User.findOneAndUpdate(filter, { $set: {
    [fields.hash]: hash,
    [fields.expires]: new Date(now.getTime() + OTP_TTL_MS),
    [fields.attempts]: 0,
    [fields.sent]: now,
  } });
  if (!updated) return false;
  try {
    await sendOtpEmail(user.email, code, purpose, OTP_TTL_MS / 60_000);
  } catch (error) {
    // Permit a retry after delivery failure without retaining an undelivered code.
    await User.updateOne({ _id: user._id, [fields.hash]: hash }, { $unset: clearOtp(purpose) });
    throw error;
  }
  return true;
}
