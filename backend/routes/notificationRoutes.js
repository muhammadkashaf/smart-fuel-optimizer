import express from "express";
import { verifyToken, checkRole } from "../middleware/auth.js";
import { getUnreadCount, listNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notificationController.js";

const router = express.Router();
router.use("/notifications", verifyToken, checkRole("Individual", "Organizational"));
router.get("/notifications", listNotifications);
router.get("/notifications/unread-count", getUnreadCount);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
