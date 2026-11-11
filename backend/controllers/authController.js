import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { clearOtp, issueOtp, matchesOtp, OTP_COOLDOWN_MS, OTP_MAX_ATTEMPTS, otpFields, validOtp } from "../services/authOtpService.js";
import { emailConfigured } from "../services/emailService.js";
import { isValidContactNumber, isValidEmail } from "../utils/validation.js";

const createToken = (user) => {
  return jwt.sign({ id: user._id, v: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
const validPassword = (value) => typeof value === "string" && value.length >= 8 && /\d/.test(value);
const normalizedEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const genericOtpError = "Invalid or expired code. Request a new code if needed.";
const forgotMessage = "If an account exists for this email, check its inbox for a password reset code.";
const verificationResendSeconds = async (userId) => {
  const user = await User.findById(userId).select("+emailVerificationOtpSentAt");
  return Math.max(1, Math.ceil(((user?.emailVerificationOtpSentAt?.getTime() ?? 0) + OTP_COOLDOWN_MS - Date.now()) / 1000));
};

const findValidOtp = async (email, otp, purpose) => {
  const fields = otpFields(purpose);
  const user = await User.findOne({ email }).select(`+${fields.hash} +${fields.expires} +${fields.attempts}`);
  if (!user || (purpose === "verification" && user.emailVerified !== false) ||
      !user[fields.hash] || !user[fields.expires] || user[fields.expires] <= new Date() ||
      (user[fields.attempts] ?? 0) >= OTP_MAX_ATTEMPTS) return null;
  if (!matchesOtp(user._id, purpose, otp, user[fields.hash])) {
    await User.updateOne({ _id: user._id, [fields.hash]: user[fields.hash], [fields.attempts]: { $lt: OTP_MAX_ATTEMPTS } },
      { $inc: { [fields.attempts]: 1 } });
    return null;
  }
  return { user, fields };
};

export const register = async (req, res, next) => {
  try {
    const { fullName, email, contactNumber, role, password } = req.body;

    if (!fullName || !email || !contactNumber || !role || !password) {
      return res.status(400).json({ message: "Please complete all required fields" });
    }

    if (!validPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters and include a number" });
    }

    if (typeof fullName !== "string" || fullName.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters" });
    }

    if (!["Individual", "Organizational"].includes(role)) {
      return res.status(400).json({ message: "Choose an Individual or Organizational account" });
    }

    const emailAddress = normalizedEmail(email);

    if (!isValidEmail(emailAddress)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (!isValidContactNumber(String(contactNumber))) {
      return res.status(400).json({ message: "Please provide a valid contact number" });
    }

    const existingUser = await User.findOne({ email: emailAddress });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email address already exists" });
    }

    if (!emailConfigured()) {
      return res.status(503).json({ message: "Email delivery is unavailable. Please try again later." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: String(fullName).trim(),
      email: emailAddress,
      contactNumber,
      role,
      password: hashedPassword,
      emailVerified: false,
    });
    try {
      await issueOtp(user, "verification");
    } catch {
      return res.status(503).json({
        message: "Account created, but the verification email could not be sent. Please resend the code.",
        email: user.email,
        verificationRequired: true,
      });
    }

    res.status(201).json({
      message: "Account created. Enter the code sent to your email to verify it.",
      email: user.email,
      verificationRequired: true,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter your email address and password" });
    }
    if (typeof password !== "string") {
      return res.status(400).json({ message: "Please enter a valid password" });
    }

    const emailAddress = normalizedEmail(email);

    if (!isValidEmail(emailAddress)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: emailAddress }).select("+password +tokenVersion");
    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    if (user.emailVerified === false) {
      let codeSent;
      try {
        codeSent = await issueOtp(user, "verification");
      } catch {
        return res.status(503).json({
          code: "EMAIL_VERIFICATION_DELIVERY_FAILED",
          message: "Verification email could not be sent. Please try again.",
          email: user.email,
        });
      }
      const resendAfterSeconds = codeSent ? Math.ceil(OTP_COOLDOWN_MS / 1000) : await verificationResendSeconds(user._id);
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: codeSent ? "A new verification code has been sent to your email." : "Verify your email before signing in.",
        email: user.email,
        verificationCodeSent: codeSent,
        resendAfterSeconds,
      });
    }

    const token = createToken(user);

    res.json({
      message: "You have been signed in successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        contactNumber: user.contactNumber,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const email = normalizedEmail(req.body?.email);
    if (!isValidEmail(email)) return res.status(400).json({ message: "Please provide a valid email address" });
    const user = await User.findOne({ email });
    if (!user || user.emailVerified !== false) {
      return res.json({ message: "If this account needs verification, check its inbox for a code." });
    }
    if (!emailConfigured()) return res.status(503).json({ message: "Email delivery is unavailable. Please try again later." });
    let sent;
    try {
      sent = await issueOtp(user, "verification");
    } catch {
      return res.status(503).json({ message: "Verification email could not be sent. Please try again." });
    }
    if (!sent) {
      res.setHeader("Retry-After", String(await verificationResendSeconds(user._id)));
      return res.status(429).json({ message: "Please wait a minute before requesting another code." });
    }
    res.json({ message: "A new verification code has been sent." });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const email = normalizedEmail(req.body?.email);
    const { otp } = req.body ?? {};
    if (!isValidEmail(email) || !validOtp(otp)) {
      return res.status(400).json({ message: "Enter a valid email and 6-digit code." });
    }
    const match = await findValidOtp(email, otp, "verification");
    if (!match) return res.status(400).json({ message: genericOtpError });
    const { user, fields } = match;
    const verified = await User.findOneAndUpdate({
      _id: user._id, emailVerified: false, [fields.hash]: user[fields.hash],
      [fields.expires]: { $gt: new Date() }, [fields.attempts]: { $lt: OTP_MAX_ATTEMPTS },
    }, { $set: { emailVerified: true }, $unset: clearOtp("verification") });
    if (!verified) return res.status(400).json({ message: genericOtpError });
    res.json({ message: "Email verified. You can now sign in." });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const email = normalizedEmail(req.body?.email);
    if (!isValidEmail(email)) return res.status(400).json({ message: "Please provide a valid email address" });
    if (!emailConfigured()) return res.status(503).json({ message: "Email delivery is unavailable. Please try again later." });
    const user = await User.findOne({ email });
    if (user) {
      try {
        await issueOtp(user, "reset");
      } catch {
        // Return the same response for known and unknown addresses.
        console.error("Password reset email could not be sent.");
      }
    }
    res.json({ message: forgotMessage });
  } catch (error) {
    next(error);
  }
};

export const verifyResetOtp = async (req, res, next) => {
  try {
    const email = normalizedEmail(req.body?.email);
    const { otp } = req.body ?? {};
    if (!isValidEmail(email) || !validOtp(otp)) {
      return res.status(400).json({ message: "Enter a valid email and 6-digit code." });
    }
    if (!(await findValidOtp(email, otp, "reset"))) {
      return res.status(400).json({ message: genericOtpError });
    }
    res.json({ message: "Code verified. Choose a new password." });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const email = normalizedEmail(req.body?.email);
    const { otp, newPassword, confirmPassword } = req.body ?? {};
    if (!isValidEmail(email) || !validOtp(otp)) {
      return res.status(400).json({ message: "Enter a valid email and 6-digit code." });
    }
    if (!validPassword(newPassword) || newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords must match, be at least 8 characters, and include a number." });
    }
    const match = await findValidOtp(email, otp, "reset");
    if (!match) return res.status(400).json({ message: genericOtpError });
    const { user, fields } = match;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const reset = await User.findOneAndUpdate({
      _id: user._id, [fields.hash]: user[fields.hash],
      [fields.expires]: { $gt: new Date() }, [fields.attempts]: { $lt: OTP_MAX_ATTEMPTS },
    }, { $set: { password: hashedPassword }, $inc: { tokenVersion: 1 }, $unset: clearOtp("reset") });
    if (!reset) return res.status(400).json({ message: genericOtpError });
    res.json({ message: "Password updated. Sign in with your new password." });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  return res.json({ message: "You have been signed out successfully" });
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email, contactNumber, password } = req.body ?? {};
    const updates = {};

    if (password !== undefined) {
      return res.status(400).json({ message: "Use Change password to update your password." });
    }

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || fullName.trim().length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters" });
      }
      updates.fullName = fullName.trim();
    }

    if (email !== undefined) {
      if (normalizedEmail(email) !== req.user.email) {
        return res.status(400).json({ message: "Email cannot be changed from Profile." });
      }
    }

    if (contactNumber !== undefined) {
      if (!isValidContactNumber(String(contactNumber))) {
        return res.status(400).json({ message: "Please provide a valid contact number" });
      }

      updates.contactNumber = contactNumber;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Your profile has been updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body ?? {};
    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({ code: "CURRENT_PASSWORD_REQUIRED", message: "Enter your current password." });
    }
    if (!validPassword(newPassword)) {
      return res.status(400).json({ code: "WEAK_PASSWORD", message: "New password must be at least 8 characters and include a number." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ code: "PASSWORD_MISMATCH", message: "New passwords do not match." });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ code: "CURRENT_PASSWORD_INVALID", message: "Current password is incorrect." });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ code: "SAME_PASSWORD", message: "Choose a different new password." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await User.updateOne({ _id: user._id, password: user.password }, { $set: { password: hashedPassword } });
    if (!result.matchedCount) {
      return res.status(409).json({ code: "PASSWORD_CHANGED", message: "Your password changed during this request. Please try again." });
    }
    res.json({ message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
};
