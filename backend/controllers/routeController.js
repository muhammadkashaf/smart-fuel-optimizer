import Trip from "../models/Trip.js";
import Vehicle from "../models/Vehicle.js";
import { routingProvider, RoutingError } from "../services/routingProvider.js";
import { parseLocation, validateEfficiency, estimateRoutes, vehicleFingerprint, routePlanStore } from "../services/routePlanning.js";
import { syncCrisisNotifications, syncInefficientTripNotification } from "../services/notificationService.js";

const handleError = (error, res, next) => error instanceof RoutingError
  ? res.status(error.status).json({ code: error.code, message: error.message }) : next(error);

async function ownedTripAndVehicle(req) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw new RoutingError(400, "INVALID_TRIP_ID", "Trip ID is invalid");
  const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
  if (!trip) throw new RoutingError(404, "TRIP_NOT_FOUND", "Trip not found");
  const vehicle = await Vehicle.findOne({ _id: trip.vehicleId, userId: req.user._id });
  if (!vehicle) throw new RoutingError(404, "VEHICLE_NOT_FOUND", "The vehicle for this trip is unavailable. Update the trip's vehicle before planning a route.");
  return { trip, vehicle };
}

export const getRouteOptions = async (req, res, next) => {
  try {
    const { trip, vehicle } = await ownedTripAndVehicle(req);
    validateEfficiency(vehicle);
    const start = parseLocation(req.body?.start);
    const destination = parseLocation(req.body?.destination);
    if (start.coordinates.lat === destination.coordinates.lat && start.coordinates.lng === destination.coordinates.lng) {
      throw new RoutingError(400, "SAME_LOCATION", "Choose different starting and destination locations.");
    }
    const { routes } = await routingProvider.directions(start.coordinates, destination.coordinates);
    const options = estimateRoutes(routes, vehicle);
    const calculatedAt = new Date().toISOString();
    const planId = options.length ? routePlanStore.put({
      userId: String(req.user._id), tripId: String(trip._id), tripVersion: trip.updatedAt.toISOString(),
      vehicleFingerprint: vehicleFingerprint(vehicle), start, destination, calculatedAt,
      options: options.map(({ geometry: _geometry, ...option }) => option),
    }) : null;
    return res.json({ planId, options, calculatedAt });
  } catch (error) { return handleError(error, res, next); }
};

export const saveRoute = async (req, res, next) => {
  try {
    const { trip, vehicle } = await ownedTripAndVehicle(req);
    validateEfficiency(vehicle);
    const { planId, optionId } = req.body ?? {};
    if (typeof planId !== "string" || typeof optionId !== "string") throw new RoutingError(400, "INVALID_ROUTE", "Select a calculated route before saving.");
    const plan = routePlanStore.get(planId, req.user._id, trip._id);
    if (plan.tripVersion !== trip.updatedAt.toISOString() || plan.vehicleFingerprint !== vehicleFingerprint(vehicle)) {
      throw new RoutingError(409, "ROUTE_PLAN_CHANGED", "This trip or vehicle has changed. Reload the planner and find routes again.");
    }
    const option = plan.options.find((item) => item.id === optionId);
    if (!option) throw new RoutingError(400, "INVALID_ROUTE", "Select one of the calculated routes.");
    const bestAvailableEstimatedResource = Math.min(...plan.options.map((item) => item.estimatedResource));
    const selectedRoute = {
      distanceKm: option.distanceKm, durationMinutes: option.durationMinutes,
      estimatedResource: option.estimatedResource, resourceUnit: option.resourceUnit,
      calculatedAt: new Date(plan.calculatedAt), plannedAt: new Date(),
      fuelEfficiency: vehicle.fuelEfficiency, fuelType: vehicle.fuelType,
      wasLowestConsumption: Math.abs(option.estimatedResource - bestAvailableEstimatedResource) < 1e-9,
      bestAvailableEstimatedResource,
    };
    // Optimistic update prevents saving over a trip changed in another tab during this request.
    const updated = await Trip.findOneAndUpdate({ _id: trip._id, userId: req.user._id, updatedAt: trip.updatedAt }, {
      $set: { startLocation: plan.start.label, destination: plan.destination.label,
        startCoordinates: plan.start.coordinates, destinationCoordinates: plan.destination.coordinates, selectedRoute },
    }, { new: true, runValidators: true });
    if (!updated) throw new RoutingError(409, "ROUTE_PLAN_CHANGED", "This trip has changed. Reload the planner and find routes again.");
    plan.tripVersion = updated.updatedAt.toISOString();
    await syncInefficientTripNotification(req.user._id, updated);
    await syncCrisisNotifications(req.user._id);
    return res.json({ message: "Route saved to your trip", trip: updated });
  } catch (error) { return handleError(error, res, next); }
};
