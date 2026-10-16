import express from "express";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { getCrisisMode, updateCrisisMode, getRecommendations } from "../controllers/crisisModeController.js";

const router = express.Router();
router.use("/crisis-mode", verifyToken, checkRole("Individual", "Organizational"));
router.get("/crisis-mode", getCrisisMode);
router.put("/crisis-mode", updateCrisisMode);
router.get("/crisis-mode/recommendations", getRecommendations);

export default router;
