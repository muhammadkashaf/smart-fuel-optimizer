// Date-only Trip values are stored at UTC midnight. Compare their YYYY-MM-DD
// value with today's calendar date in Pakistan, including all of today.
export const pakistanToday = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name) => parts.find((item) => item.type === name).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const dateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const validCoordinates = (point) => point && Number.isFinite(point.lat) &&
  Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
const validEfficiency = (vehicle) => Number.isFinite(vehicle.fuelEfficiency) && vehicle.fuelEfficiency > 0 &&
  ["Petrol", "Diesel", "Electric"].includes(vehicle.fuelType);
const expectedUnit = (vehicle) => vehicle.fuelType === "Electric" ? "kWh" : "L";

export const haversineKm = (first, second) => {
  const latitude = (second.lat - first.lat) * Math.PI / 180;
  const longitude = (second.lng - first.lng) * Math.PI / 180;
  const arc = Math.sin(latitude / 2) ** 2 +
    Math.cos(first.lat * Math.PI / 180) * Math.cos(second.lat * Math.PI / 180) * Math.sin(longitude / 2) ** 2;
  const safeArc = Math.min(1, Math.max(0, arc));
  return 6371 * 2 * Math.atan2(Math.sqrt(safeArc), Math.sqrt(1 - safeArc));
};

// A saved estimate is current only for the vehicle efficiency and fuel type
// used when it was calculated. Legacy routes without a snapshot need replanning.
export const isRouteStale = (trip, vehicle) => {
  const route = trip.selectedRoute;
  return Boolean(route) && (!validEfficiency(vehicle) ||
    !Number.isFinite(route.fuelEfficiency) || route.fuelEfficiency <= 0 ||
    Math.abs(route.fuelEfficiency - vehicle.fuelEfficiency) > 1e-9 ||
    route.fuelType !== vehicle.fuelType || route.resourceUnit !== expectedUnit(vehicle));
};

const validRouteEstimate = (trip, vehicle) => {
  const route = trip.selectedRoute;
  return route && !isRouteStale(trip, vehicle) &&
    Number.isFinite(route.distanceKm) && route.distanceKm > 0 &&
    Number.isFinite(route.estimatedResource) && route.estimatedResource > 0
    ? { amount: route.estimatedResource, unit: route.resourceUnit } : null;
};

const isActionablePlannedTrip = (trip, today, vehicles) => {
  const day = dateKey(trip.tripDate);
  return trip.status === "Planned" && day !== null && day >= today &&
    vehicles.has(String(trip.vehicleId));
};

const tripDetails = (trip, vehicle) => ({
  id: String(trip._id),
  start: typeof trip.startLocation === "string" ? trip.startLocation : "Starting point unavailable",
  destination: typeof trip.destination === "string" ? trip.destination : "Destination unavailable",
  tripDate: dateKey(trip.tripDate),
  vehicleName: vehicle.vehicleName || "Vehicle",
  vehicleRegistration: vehicle.registrationNumber || "",
});

const recommendation = (type, severity, title, message, trips, action, extra = {}) => ({
  id: `${type}:${trips.map((trip) => trip.id).join(":")}`,
  type, severity, title, message,
  relatedTripIds: trips.map((trip) => trip.id),
  relatedTrips: trips,
  action, ...extra,
});

const inefficientSelection = (trip, estimate) => {
  const route = trip.selectedRoute;
  return estimate && route.wasLowestConsumption === false &&
    Number.isFinite(route.bestAvailableEstimatedResource) && route.bestAvailableEstimatedResource > 0 &&
    route.bestAvailableEstimatedResource + 1e-9 < estimate.amount;
};

// The 5 km link must also be no longer than either trip itself.
// Each trip appears in at most one combination suggestion: closest links win.
export const COMBINE_PROXIMITY_KM = 5;
const combinationCandidates = (planned, vehicles) => {
  const candidates = [];
  for (let firstIndex = 0; firstIndex < planned.length; firstIndex += 1) {
    const first = planned[firstIndex];
    if (!validCoordinates(first.startCoordinates) || !validCoordinates(first.destinationCoordinates)) continue;
    const firstLength = haversineKm(first.startCoordinates, first.destinationCoordinates);
    if (firstLength < 0.1) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < planned.length; secondIndex += 1) {
      const second = planned[secondIndex];
      if (String(first.vehicleId) !== String(second.vehicleId) || dateKey(first.tripDate) !== dateKey(second.tripDate) ||
        !validCoordinates(second.startCoordinates) || !validCoordinates(second.destinationCoordinates)) continue;
      const secondLength = haversineKm(second.startCoordinates, second.destinationCoordinates);
      if (secondLength < 0.1) continue;
      const linkKm = Math.min(
        haversineKm(first.destinationCoordinates, second.startCoordinates),
        haversineKm(second.destinationCoordinates, first.startCoordinates),
      );
      if (linkKm <= COMBINE_PROXIMITY_KM && linkKm <= Math.min(firstLength, secondLength)) {
        candidates.push({ first, second, linkKm });
      }
    }
  }
  candidates.sort((a, b) => a.linkKm - b.linkKm ||
    dateKey(a.first.tripDate).localeCompare(dateKey(b.first.tripDate)) ||
    String(a.first._id).localeCompare(String(b.first._id)) || String(a.second._id).localeCompare(String(b.second._id)));
  const used = new Set();
  const result = [];
  for (const { first, second } of candidates) {
    const firstId = String(first._id);
    const secondId = String(second._id);
    if (used.has(firstId) || used.has(secondId)) continue;
    used.add(firstId);
    used.add(secondId);
    const vehicle = vehicles.get(String(first.vehicleId));
    result.push(recommendation(
      "COMBINE_TRIPS", "MEDIUM", "Consider combining these trips",
      "These trips use the same vehicle on the same day, and one destination is near the other starting point. Consider whether one journey could cover both.",
      [tripDetails(first, vehicle), tripDetails(second, vehicle)],
      { label: "Review trips", path: "/trips" },
    ));
  }
  return result;
};

export const buildCrisisRecommendations = (trips, vehicles, today = pakistanToday()) => {
  const ownedVehicles = new Map(vehicles.map((vehicle) => [String(vehicle._id), vehicle]));
  const seenTrips = new Set();
  const planned = trips.filter((trip) => {
    const id = String(trip._id);
    if (seenTrips.has(id) || !isActionablePlannedTrip(trip, today, ownedVehicles)) return false;
    seenTrips.add(id);
    return true;
  }).sort((a, b) => dateKey(a.tripDate).localeCompare(dateKey(b.tripDate)) || String(a._id).localeCompare(String(b._id)));
  const summary = {
    plannedTrips: planned.length, nonEssentialTrips: 0, tripsWithoutRoutes: 0,
    estimatedPlannedFuelLiters: 0, estimatedPlannedEnergyKwh: 0, tripsWithEstimates: 0,
  };
  const recommendations = [];

  for (const trip of planned) {
    const vehicle = ownedVehicles.get(String(trip.vehicleId));
    const details = tripDetails(trip, vehicle);
    const estimate = validRouteEstimate(trip, vehicle);
    if (trip.priority === "Non-essential") summary.nonEssentialTrips += 1;
    if (!estimate) summary.tripsWithoutRoutes += 1;
    if (estimate) {
      summary.tripsWithEstimates += 1;
      if (estimate.unit === "L") summary.estimatedPlannedFuelLiters += estimate.amount;
      else summary.estimatedPlannedEnergyKwh += estimate.amount;
    }

    // Postponement is the primary action. Do not add route advice for this trip.
    if (trip.priority === "Non-essential") {
      recommendations.push(recommendation(
        "POSTPONE_NON_ESSENTIAL", "HIGH", "Consider postponing this trip",
        "This non-essential trip could be postponed or cancelled to conserve resources.",
        [details], { label: "View trip", path: `/trips/${details.id}/edit` },
        estimate ? { estimatedResourceSaving: estimate.amount, resourceUnit: estimate.unit } : {},
      ));
      continue;
    }
    if (!validEfficiency(vehicle)) {
      recommendations.push(recommendation(
        "UPDATE_VEHICLE_EFFICIENCY", "MEDIUM", "Update vehicle efficiency",
        "This vehicle needs a valid fuel type and efficiency before a reliable route estimate can be calculated.",
        [details], { label: "Update vehicle", path: `/vehicles/${vehicle._id}/edit` },
      ));
    } else if (!estimate) {
      const saved = Boolean(trip.selectedRoute);
      recommendations.push(recommendation(
        "PLAN_ROUTE", "INFO", saved ? "Recalculate this route" : "Plan an efficient route",
        saved
          ? "The saved route estimate is outdated or invalid. Recalculate it before travelling."
          : "Plan this trip to identify the lowest-consumption route.",
        [details], { label: saved ? "Recalculate route" : "Plan route", path: `/trips/${details.id}/route` },
      ));
    } else if (inefficientSelection(trip, estimate)) {
      recommendations.push(recommendation(
        "REVIEW_INEFFICIENT_ROUTE", "MEDIUM", "Review a lower-consumption route",
        "A lower-consumption route was available when this trip was planned. Review the route before travelling.",
        [details], { label: "Review route", path: `/trips/${details.id}/route` },
      ));
    }
  }

  recommendations.push(...combinationCandidates(planned, ownedVehicles));
  const severityOrder = { HIGH: 0, MEDIUM: 1, INFO: 2 };
  const typeOrder = { POSTPONE_NON_ESSENTIAL: 0, COMBINE_TRIPS: 1, REVIEW_INEFFICIENT_ROUTE: 2,
    UPDATE_VEHICLE_EFFICIENCY: 3, PLAN_ROUTE: 4 };
  recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] ||
    a.relatedTrips[0].tripDate.localeCompare(b.relatedTrips[0].tripDate) ||
    typeOrder[a.type] - typeOrder[b.type] || a.id.localeCompare(b.id));
  return { summary, recommendations };
};
