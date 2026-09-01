import express from "express";
const router = express.Router();

import { verifyToken } from "../middleware/auth.js";
import * as vehicleController from "../controllers/vehicleController.js";

router.use(verifyToken);

router.post("/vehicles", vehicleController.createVehicle);
router.get("/vehicles", vehicleController.getVehicles);
router.get("/vehicles/:id", vehicleController.getVehicleById);
router.put("/vehicles/:id", vehicleController.updateVehicle);
router.delete("/vehicles/:id", vehicleController.deleteVehicle);

export default router;
