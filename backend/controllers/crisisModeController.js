import User from "../models/User.js";
import { getCurrentCrisisRecommendations } from "../services/currentCrisisRecommendations.js";
import { syncCrisisNotifications } from "../services/notificationService.js";

export const getCrisisMode = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("crisisModeEnabled");
    if (!user) return res.status(401).json({ message: "We could not verify your account" });
    return res.json({ enabled: user.crisisModeEnabled === true });
  } catch (error) { return next(error); }
};

export const updateCrisisMode = async (req, res, next) => {
  if (typeof req.body?.enabled !== "boolean") {
    return res.status(400).json({ message: "Enabled must be true or false" });
  }
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, role: { $in: ["Individual", "Organizational"] } },
      { $set: { crisisModeEnabled: req.body.enabled } },
      { new: true, runValidators: true },
    ).select("crisisModeEnabled");
    if (!user) return res.status(401).json({ message: "We could not verify your account" });
    await syncCrisisNotifications(req.user._id, { resolveWhenOff: true });
    return res.json({ enabled: user.crisisModeEnabled, message: user.crisisModeEnabled ? "Crisis Mode enabled" : "Crisis Mode disabled" });
  } catch (error) { return next(error); }
};

export const getRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("crisisModeEnabled");
    if (!user) return res.status(401).json({ message: "We could not verify your account" });
    if (!user.crisisModeEnabled) return res.json({ enabled: false, summary: null, recommendations: [] });

    return res.json({ enabled: true, ...await getCurrentCrisisRecommendations(req.user._id) });
  } catch (error) { return next(error); }
};
