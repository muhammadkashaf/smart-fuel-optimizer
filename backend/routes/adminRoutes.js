import express from "express";
const router = express.Router();

import { verifyToken, checkRole } from "../middleware/auth.js";
import * as adminController from "../controllers/adminController.js";

// Require valid JWT and Admin role for all admin routes
router.use(verifyToken, checkRole("Admin"));

// System statistics
router.get("/admin/stats", adminController.getAdminStats);

// User Management endpoints
router.get("/admin/users", adminController.getUsers);
router.get("/admin/users/:id", adminController.getUserById);
router.put("/admin/users/:id", adminController.updateUser);
router.delete("/admin/users/:id", adminController.deleteUser);

// Vehicle Management endpoints
router.get("/admin/vehicles", adminController.getAdminVehicles);
router.put("/admin/vehicles/:id", adminController.updateAdminVehicle);
router.delete("/admin/vehicles/:id", adminController.deleteAdminVehicle);

export default router;
