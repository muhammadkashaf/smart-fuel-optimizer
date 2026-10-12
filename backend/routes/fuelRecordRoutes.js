import express from "express";
import { verifyToken, checkRole } from "../middleware/auth.js";
import * as fuelRecordController from "../controllers/fuelRecordController.js";

const router = express.Router();
router.use(verifyToken, checkRole("Individual", "Organizational"));

router.post("/fuel-records", fuelRecordController.createFuelRecord);
router.get("/fuel-records", fuelRecordController.getFuelRecords);
router.get("/fuel-records/:id", fuelRecordController.getFuelRecordById);
router.put("/fuel-records/:id", fuelRecordController.updateFuelRecord);
router.delete("/fuel-records/:id", fuelRecordController.deleteFuelRecord);

export default router;
