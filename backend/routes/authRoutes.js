import express from "express";
const router = express.Router();

import * as authController from "../controllers/authController.js";
import * as adminController from "../controllers/adminController.js";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { authOtpRateLimit } from "../middleware/authOtpRateLimit.js";

router.post("/auth/register", authOtpRateLimit(20), authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/logout", authController.logout);
router.post("/auth/verify-email", authOtpRateLimit(20), authController.verifyEmail);
router.post("/auth/resend-verification", authOtpRateLimit(6), authController.resendVerification);
router.post("/auth/forgot-password", authOtpRateLimit(6), authController.forgotPassword);
router.post("/auth/verify-reset-otp", authOtpRateLimit(20), authController.verifyResetOtp);
router.post("/auth/reset-password", authOtpRateLimit(20), authController.resetPassword);

router.get("/profile", verifyToken, authController.getProfile);
router.put("/profile", verifyToken, authController.updateProfile);
router.put("/profile/password", verifyToken, authController.changePassword);

router.get("/admin-only", verifyToken, checkRole("Admin"), adminController.getAdminAccess);

export default router;
