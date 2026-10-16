import Trip, { tripPriorities, tripStatuses } from "../models/Trip.js";
import Vehicle from "../models/Vehicle.js";
import { resolveTripNotifications, syncCrisisNotifications, syncInefficientTripNotification } from "../services/notificationService.js";

const isValidId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
const isNonEmptyText = (value) => typeof value === "string" && value.trim().length > 0;
const validCoordinates = (value) => value && typeof value === "object" &&
  typeof value.lat === "number" && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90 &&
  typeof value.lng === "number" && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180;
const sameCoordinates = (a, b) => a?.lat === b?.lat && a?.lng === b?.lng;
const parseDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
};
const findOwnedVehicle = (vehicleId, userId) => Vehicle.findOne({ _id: vehicleId, userId });
const populateVehicle = (query) => query.populate("vehicleId", "vehicleName registrationNumber");

const validateFields = (body, requireAll) => {
  const required = ["vehicleId", "startLocation", "destination", "tripDate"];
  if (requireAll && required.some((field) => body[field] === undefined)) return "Complete all required trip details";
  if (body.vehicleId !== undefined && !isValidId(body.vehicleId)) return "Vehicle ID is invalid";
  if (body.startLocation !== undefined && !isNonEmptyText(body.startLocation)) return "Starting point is required";
  if (body.destination !== undefined && !isNonEmptyText(body.destination)) return "Destination is required";
  if (body.startCoordinates !== undefined && !validCoordinates(body.startCoordinates)) return "Select a valid starting point";
  if (body.destinationCoordinates !== undefined && !validCoordinates(body.destinationCoordinates)) return "Select a valid destination";
  if (body.tripDate !== undefined && !parseDate(body.tripDate)) return "Enter a valid trip date (YYYY-MM-DD)";
  if (body.priority !== undefined && !tripPriorities.includes(body.priority)) return "Trip priority is invalid";
  if (body.status !== undefined && !tripStatuses.includes(body.status)) return "Trip status is invalid";
  if (body.purpose !== undefined && typeof body.purpose !== "string") return "Trip purpose is invalid";
  return null;
};

export const createTrip = async (req, res, next) => {
  try {
    const body = req.body || {};
    const invalid = validateFields(body, true);
    if (invalid) return res.status(400).json({ message: invalid });
    const vehicle = await findOwnedVehicle(body.vehicleId, req.user._id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const created = await Trip.create({
      userId: req.user._id,
      vehicleId: vehicle._id,
      startLocation: body.startLocation.trim(),
      destination: body.destination.trim(),
      startCoordinates: body.startCoordinates,
      destinationCoordinates: body.destinationCoordinates,
      tripDate: parseDate(body.tripDate),
      priority: body.priority ?? "Normal",
      purpose: body.purpose?.trim() ?? "",
      status: body.status ?? "Planned",
    });
    const trip = await populateVehicle(Trip.findById(created._id));
    await syncCrisisNotifications(req.user._id);
    return res.status(201).json({ message: "Trip added successfully", trip });
  } catch (error) {
    return next(error);
  }
};

export const getTrips = async (req, res, next) => {
  try {
    const { vehicleId, status, priority } = req.query;
    if (vehicleId !== undefined && !isValidId(vehicleId)) return res.status(400).json({ message: "Vehicle ID is invalid" });
    if (status !== undefined && !tripStatuses.includes(status)) return res.status(400).json({ message: "Trip status is invalid" });
    if (priority !== undefined && !tripPriorities.includes(priority)) return res.status(400).json({ message: "Trip priority is invalid" });
    if (vehicleId && !(await findOwnedVehicle(vehicleId, req.user._id))) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const vehicles = vehicleId
      ? [vehicleId]
      : (await Vehicle.find({ userId: req.user._id }).select("_id")).map((vehicle) => vehicle._id);
    const filter = { userId: req.user._id, vehicleId: { $in: vehicles } };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    const trips = await populateVehicle(Trip.find(filter).sort({ tripDate: -1, createdAt: -1 }));
    return res.json({ trips });
  } catch (error) {
    return next(error);
  }
};

export const getTripById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Trip ID is invalid" });
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trip || !(await findOwnedVehicle(trip.vehicleId, req.user._id))) {
      return res.status(404).json({ message: "Trip not found" });
    }
    await trip.populate("vehicleId", "vehicleName registrationNumber");
    return res.json({ trip });
  } catch (error) {
    return next(error);
  }
};

export const updateTrip = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Trip ID is invalid" });
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trip || !(await findOwnedVehicle(trip.vehicleId, req.user._id))) {
      return res.status(404).json({ message: "Trip not found" });
    }
    const body = req.body || {};
    const invalid = validateFields(body, false);
    if (invalid) return res.status(400).json({ message: invalid });
    const startChanged = body.startLocation !== undefined && body.startLocation.trim() !== trip.startLocation;
    const destinationChanged = body.destination !== undefined && body.destination.trim() !== trip.destination;
    const locationChanged = startChanged || destinationChanged ||
      (body.startCoordinates !== undefined && !sameCoordinates(body.startCoordinates, trip.startCoordinates)) ||
      (body.destinationCoordinates !== undefined && !sameCoordinates(body.destinationCoordinates, trip.destinationCoordinates));
    const vehicleChanged = body.vehicleId !== undefined && String(body.vehicleId) !== String(trip.vehicleId);
    if (body.vehicleId !== undefined) {
      const vehicle = await findOwnedVehicle(body.vehicleId, req.user._id);
      if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
      trip.vehicleId = vehicle._id;
    }
    if (body.startLocation !== undefined) trip.startLocation = body.startLocation.trim();
    if (body.destination !== undefined) trip.destination = body.destination.trim();
    if (body.tripDate !== undefined) trip.tripDate = parseDate(body.tripDate);
    if (body.priority !== undefined) trip.priority = body.priority;
    if (body.purpose !== undefined) trip.purpose = body.purpose.trim();
    if (body.status !== undefined) trip.status = body.status;
    if (body.startCoordinates !== undefined) trip.startCoordinates = body.startCoordinates;
    else if (startChanged) trip.startCoordinates = undefined;
    if (body.destinationCoordinates !== undefined) trip.destinationCoordinates = body.destinationCoordinates;
    else if (destinationChanged) trip.destinationCoordinates = undefined;
    if (locationChanged || vehicleChanged) trip.selectedRoute = undefined;
    await trip.save();
    await syncInefficientTripNotification(req.user._id, trip);
    await syncCrisisNotifications(req.user._id);
    await trip.populate("vehicleId", "vehicleName registrationNumber");
    return res.json({ message: "Trip updated successfully", trip });
  } catch (error) {
    return next(error);
  }
};

export const deleteTrip = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Trip ID is invalid" });
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user._id });
    if (!trip || !(await findOwnedVehicle(trip.vehicleId, req.user._id))) {
      return res.status(404).json({ message: "Trip not found" });
    }
    await trip.deleteOne();
    await resolveTripNotifications(req.user._id, trip._id);
    await syncCrisisNotifications(req.user._id);
    return res.json({ message: "Trip removed successfully" });
  } catch (error) {
    return next(error);
  }
};
