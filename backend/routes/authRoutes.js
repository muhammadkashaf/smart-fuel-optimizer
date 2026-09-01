import express from "express";
const router = express.Router();

import * as authController from "../controllers/authController.js";
import * as adminController from "../controllers/adminController.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/logout", authController.logout);

router.get("/profile", verifyToken, authController.getProfile);
router.put("/profile", verifyToken, authController.updateProfile);

router.get("/admin-only", verifyToken, checkRole("Admin"), adminController.getAdminAccess);

export default router;
