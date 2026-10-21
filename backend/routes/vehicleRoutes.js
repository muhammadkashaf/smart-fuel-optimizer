import express from "express";
const router = express.Router();

import { verifyToken, checkRole } from "../middleware/auth.js";
import * as vehicleController from "../controllers/vehicleController.js";

router.use("/vehicles", verifyToken, checkRole("Individual", "Organizational"));

router.post("/vehicles", vehicleController.createVehicle);
router.get("/vehicles", vehicleController.getVehicles);
router.get("/vehicles/:id", vehicleController.getVehicleById);
router.put("/vehicles/:id", vehicleController.updateVehicle);
router.delete("/vehicles/:id", vehicleController.deleteVehicle);

export default router;
