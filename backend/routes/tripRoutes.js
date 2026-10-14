import express from "express";
import { verifyToken, checkRole } from "../middleware/auth.js";
import * as tripController from "../controllers/tripController.js";
import { getRouteOptions, saveRoute } from "../controllers/routeController.js";
import { routingRateLimit } from "../middleware/routingRateLimit.js";

const router = express.Router();
router.use("/trips", verifyToken, checkRole("Individual", "Organizational"));

router.post("/trips", tripController.createTrip);
router.get("/trips", tripController.getTrips);
router.get("/trips/:id", tripController.getTripById);
router.put("/trips/:id", tripController.updateTrip);
router.delete("/trips/:id", tripController.deleteTrip);
router.post("/trips/:id/route-options", routingRateLimit(10), getRouteOptions);
router.put("/trips/:id/route", saveRoute);

export default router;
