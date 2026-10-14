import { randomUUID } from "node:crypto";
import { RoutingError, validCoordinates } from "./routingProvider.js";

export function parseLocation(value) {
  if (!value || typeof value.label !== "string" || !value.label.trim() || value.label.length > 500 || !validCoordinates(value.coordinates)) {
    throw new RoutingError(400, "INVALID_LOCATION", "Select a starting point and destination from the search suggestions.");
  }
  return { label: value.label.trim(), coordinates: { lat: value.coordinates.lat, lng: value.coordinates.lng } };
}

export function validateEfficiency(vehicle) {
  if (typeof vehicle.fuelEfficiency !== "number" || !Number.isFinite(vehicle.fuelEfficiency) || vehicle.fuelEfficiency <= 0) {
    throw new RoutingError(422, "INVALID_EFFICIENCY", "Update this vehicle's efficiency to a value greater than zero before finding routes.");
  }
  if (!["Petrol", "Diesel", "Electric"].includes(vehicle.fuelType)) throw new RoutingError(422, "INVALID_VEHICLE", "Update this vehicle's fuel type before finding routes.");
}

export function estimateRoutes(routes, vehicle) {
  validateEfficiency(vehicle);
  const options = routes.map((route, index) => ({
    ...route,
    id: String(index + 1),
    name: `Route ${index + 1}`,
    estimatedResource: route.distanceKm / vehicle.fuelEfficiency,
    resourceUnit: vehicle.fuelType === "Electric" ? "kWh" : "L",
    isRecommended: false,
    isShortest: false,
    isFastest: false,
  }));
  if (options.some((option) => !Number.isFinite(option.estimatedResource))) {
    throw new RoutingError(422, "INVALID_EFFICIENCY", "Update this vehicle's efficiency before finding routes.");
  }
  if (options.length) {
    const recommended = options.reduce((best, option) => option.estimatedResource < best.estimatedResource ||
      (option.estimatedResource === best.estimatedResource && option.durationMinutes < best.durationMinutes) ? option : best);
    const shortest = Math.min(...options.map((option) => option.distanceKm));
    const fastest = Math.min(...options.map((option) => option.durationMinutes));
    options.forEach((option) => {
      option.isRecommended = option.id === recommended.id;
      option.isShortest = option.distanceKm === shortest;
      option.isFastest = option.durationMinutes === fastest;
    });
  }
  return options;
}

export const vehicleFingerprint = (vehicle) => `${vehicle._id}:${vehicle.fuelType}:${vehicle.fuelEfficiency}`;

// Only short-lived trusted summaries are retained; third-party geometry is never stored.
export function createRoutePlanStore({ now = Date.now, ttlMs = 15 * 60 * 1000, maxEntries = 500 } = {}) {
  const plans = new Map();
  return {
    put(plan) {
      for (const [id, item] of plans) if (item.expiresAt <= now()) plans.delete(id);
      if (plans.size >= maxEntries) plans.delete(plans.keys().next().value);
      const id = randomUUID();
      plans.set(id, { ...plan, expiresAt: now() + ttlMs });
      return id;
    },
    get(id, userId, tripId) {
      const plan = plans.get(id);
      if (!plan || plan.expiresAt <= now()) {
        plans.delete(id);
        throw new RoutingError(409, "ROUTE_OPTIONS_EXPIRED", "These route options have expired. Find routes again before saving.");
      }
      if (plan.userId !== String(userId) || plan.tripId !== String(tripId)) throw new RoutingError(404, "ROUTE_NOT_FOUND", "Route option not found. Find routes again.");
      return plan;
    },
  };
}

export const routePlanStore = createRoutePlanStore();
