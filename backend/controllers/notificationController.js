import Notification from "../models/Notification.js";

const unreadFilter = (userId) => ({ userId, isRead: false, isResolved: false });
const validId = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
const publicNotification = (item) => ({
  _id: String(item._id), type: item.type, severity: item.severity,
  title: item.title, message: item.message, actionPath: item.actionPath,
  isRead: item.isRead, isResolved: item.isResolved,
  lastTriggeredAt: item.lastTriggeredAt, createdAt: item.createdAt, updatedAt: item.updatedAt,
});

export const listNotifications = async (req, res, next) => {
  const status = req.query.status ?? "all";
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  if (!["all", "unread"].includes(status) || !Number.isInteger(page) || page < 1 ||
    !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ message: "Enter valid notification filters" });
  }
  try {
    const filter = status === "unread" ? unreadFilter(req.user._id) : { userId: req.user._id };
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ lastTriggeredAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments(unreadFilter(req.user._id)),
    ]);
    return res.json({ notifications: notifications.map(publicNotification), unreadCount,
      pagination: { page, limit, total, hasMore: page * limit < total } });
  } catch (error) { return next(error); }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    return res.json({ unreadCount: await Notification.countDocuments(unreadFilter(req.user._id)) });
  } catch (error) { return next(error); }
};

export const markNotificationRead = async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Notification ID is invalid" });
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { isRead: true } },
      { new: true },
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    return res.json({ notification: publicNotification(notification),
      unreadCount: await Notification.countDocuments(unreadFilter(req.user._id)) });
  } catch (error) { return next(error); }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } });
    return res.json({ unreadCount: await Notification.countDocuments(unreadFilter(req.user._id)) });
  } catch (error) { return next(error); }
};
