import express from "express";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { getBudget, getBudgetSummary, getPreviousBudget, putBudget } from "../controllers/budgetController.js";

const router = express.Router();
router.use("/budgets", verifyToken, checkRole("Individual", "Organizational"));

router.put("/budgets/:year/:month", putBudget);
router.get("/budgets/:year/:month", getBudget);
router.get("/budgets/:year/:month/summary", getBudgetSummary);
router.get("/budgets/:year/:month/previous", getPreviousBudget);

export default router;
