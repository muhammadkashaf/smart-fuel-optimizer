import Notification from "../models/Notification.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import { getMonthlyBudgetState, pkrCents } from "./budgetSummary.js";
import { getCurrentCrisisRecommendations } from "./currentCrisisRecommendations.js";
import { isRouteStale, pakistanToday } from "./crisisRecommendations.js";

const money = new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const resource = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 });
const safeActionPath = (path) => typeof path === "string" &&
  (/^\/fuel-budget\?year=\d{4}&month=(?:[1-9]|1[0-2])$/.test(path) ||
    /^\/trips(?:\/[a-f\d]{24}\/(?:edit|route))?$/i.test(path) ||
    /^\/vehicles\/[a-f\d]{24}\/edit$/i.test(path) || path === "/crisis-mode") ? path : "";

async function upsertNotification(userId, dedupeKey, details) {
  const filter = { userId, dedupeKey };
  const update = {
    $set: { ...details, actionPath: safeActionPath(details.actionPath) },
    $setOnInsert: { userId, dedupeKey, isRead: false, isResolved: false, resolvedAt: null, lastTriggeredAt: new Date() },
  };
  try {
    await Notification.findOneAndUpdate(filter, update, { upsert: true, runValidators: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    await Notification.updateOne(filter, { $set: update.$set }, { runValidators: true });
  }
  // A resolved event that becomes true again is a new unread action on the same document.
  await Notification.updateOne({ ...filter, isResolved: true }, {
    $set: { isResolved: false, resolvedAt: null, isRead: false, lastTriggeredAt: new Date() },
  });
}

async function resolveNotification(userId, dedupeKey) {
  await Notification.updateOne({ userId, dedupeKey, isResolved: false }, {
    $set: { isResolved: true, resolvedAt: new Date() },
  });
}

export const periodFromDate = (date) => ({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 });

export async function syncBudgetExceededNotification(userId, year, month) {
  const key = `BUDGET_EXCEEDED:${year}:${month}`;
  const state = await getMonthlyBudgetState(userId, year, month);
  if (!state.isExceeded) return resolveNotification(userId, key);
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-PK", { month: "long", timeZone: "UTC" });
  await upsertNotification(userId, key, {
    type: "BUDGET_EXCEEDED", severity: "HIGH", title: "Monthly fuel budget exceeded",
    message: `You have exceeded your ${monthName} ${year} fuel budget by PKR ${money.format((pkrCents(state.spent) - pkrCents(state.budget)) / 100)}.`,
    relatedEntityType: "Budget", actionPath: `/fuel-budget?year=${year}&month=${month}`,
  });
}

export async function syncInefficientTripNotification(userId, tripOrId) {
  const trip = typeof tripOrId === "string" ? await Trip.findOne({ _id: tripOrId, userId }) : tripOrId;
  const id = String(trip?._id ?? tripOrId);
  const key = `INEFFICIENT_TRIP:${id}`;
  if (!trip || trip.status !== "Planned" || trip.tripDate?.toISOString().slice(0, 10) < pakistanToday()) {
    return resolveNotification(userId, key);
  }
  const vehicleId = trip.vehicleId?._id ?? trip.vehicleId;
  const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
  const route = trip.selectedRoute;
  if (!vehicle || !route || isRouteStale(trip, vehicle) || route.wasLowestConsumption !== false ||
    !Number.isFinite(route.distanceKm) || route.distanceKm <= 0 ||
    !Number.isFinite(route.estimatedResource) || route.estimatedResource <= 0 ||
    !Number.isFinite(route.bestAvailableEstimatedResource) || route.bestAvailableEstimatedResource <= 0 ||
    route.bestAvailableEstimatedResource + 1e-9 >= route.estimatedResource) {
    return resolveNotification(userId, key);
  }
  const difference = route.estimatedResource - route.bestAvailableEstimatedResource;
  const rounded = Number(difference.toFixed(2));
  const message = rounded > 0
    ? `The selected route for ${trip.startLocation} to ${trip.destination} uses approximately ${resource.format(rounded)} ${route.resourceUnit} more than the lowest-consumption route.`
    : `A lower-consumption route was available for ${trip.startLocation} to ${trip.destination} when this trip was planned.`;
  await upsertNotification(userId, key, {
    type: "INEFFICIENT_TRIP", severity: "MEDIUM", title: "Lower-consumption route available",
    message, relatedEntityType: "Trip", relatedEntityId: trip._id, relatedTripIds: [trip._id],
    actionPath: `/trips/${id}/route`,
  });
}

export async function resolveTripNotifications(userId, tripId) {
  await Notification.updateMany({ userId, relatedTripIds: tripId, isResolved: false }, {
    $set: { isResolved: true, resolvedAt: new Date(), actionPath: "" },
  });
  await Notification.updateMany({ userId, relatedTripIds: tripId, actionPath: { $ne: "" } }, {
    $set: { actionPath: "" },
  });
}

export async function syncCrisisNotifications(userId, { resolveWhenOff = false } = {}) {
  const user = await User.findById(userId).select("crisisModeEnabled");
  if (!user?.crisisModeEnabled) {
    if (resolveWhenOff) {
      await Notification.updateMany({ userId, type: "CRISIS_RECOMMENDATION", isResolved: false }, {
        $set: { isResolved: true, resolvedAt: new Date() },
      });
    }
    return;
  }
  const { recommendations } = await getCurrentCrisisRecommendations(userId);
  const actionable = recommendations.filter((item) => item.severity === "HIGH" || item.severity === "MEDIUM");
  const activeKeys = [];
  for (const item of actionable) {
    const key = `CRISIS_RECOMMENDATION:${item.id}`;
    activeKeys.push(key);
    await upsertNotification(userId, key, {
      type: "CRISIS_RECOMMENDATION", severity: item.severity,
      title: item.title, message: item.message,
      relatedEntityType: "CrisisRecommendation",
      relatedTripIds: item.relatedTripIds,
      actionPath: item.action.path,
    });
  }
  await Notification.updateMany({
    userId, type: "CRISIS_RECOMMENDATION", isResolved: false,
    dedupeKey: { $nin: activeKeys },
  }, { $set: { isResolved: true, resolvedAt: new Date() } });
}

export async function syncNotificationsForVehicle(userId, vehicleId) {
  const trips = await Trip.find({ userId, vehicleId }).select("_id vehicleId status tripDate selectedRoute startLocation destination");
  for (const trip of trips) await syncInefficientTripNotification(userId, trip);
  await syncCrisisNotifications(userId);
}
