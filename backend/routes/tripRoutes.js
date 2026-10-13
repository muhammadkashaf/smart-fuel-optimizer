import express from "express";
import { verifyToken, checkRole } from "../middleware/auth.js";
import * as tripController from "../controllers/tripController.js";

const router = express.Router();
router.use("/trips", verifyToken, checkRole("Individual", "Organizational"));

router.post("/trips", tripController.createTrip);
router.get("/trips", tripController.getTrips);
router.get("/trips/:id", tripController.getTripById);
router.put("/trips/:id", tripController.updateTrip);
router.delete("/trips/:id", tripController.deleteTrip);

export default router;
