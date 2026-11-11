import Vehicle from "../models/Vehicle.js";
import FuelRecord from "../models/FuelRecord.js";
import Trip from "../models/Trip.js";
import { isPositiveNumber, isValidYear } from "../utils/validation.js";
import { syncNotificationsForVehicle } from "../services/notificationService.js";

const isOwner = (vehicle, user) => {
  const ownerId = vehicle.userId?._id
    ? String(vehicle.userId._id)
    : String(vehicle.userId);
  return ownerId === String(user._id);
};


export const createVehicle = async (req, res, next) => {
  try {
    const {
      vehicleName,
      registrationNumber,
      manufacturer,
      modelYear,
      fuelType,
      fuelEfficiency,
      fuelTankCapacity,
    } = req.body;

    if (
      !vehicleName ||
      !registrationNumber ||
      !manufacturer ||
      !modelYear ||
      !fuelType ||
      fuelEfficiency === undefined ||
      fuelTankCapacity === undefined
    ) {
      return res.status(400).json({ message: "Please complete all required vehicle details" });
    }

    if (!isValidYear(modelYear)) {
      return res.status(400).json({ message: "Please provide a valid model year" });
    }

    if (!isPositiveNumber(fuelEfficiency)) {
      return res.status(400).json({ message: "Please provide a valid fuel efficiency value" });
    }

    if (!isPositiveNumber(fuelTankCapacity)) {
      return res.status(400).json({ message: "Please provide a valid fuel tank capacity" });
    }

    const vehicle = await Vehicle.create({
      vehicleName: String(vehicleName).trim(),
      registrationNumber: String(registrationNumber).trim(),
      manufacturer: String(manufacturer).trim(),
      modelYear,
      fuelType,
      fuelEfficiency,
      fuelTankCapacity,
      userId: req.user._id,
    });

    res.status(201).json({
      message: "Vehicle added successfully",
      vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const getVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.user._id }).populate("userId", "fullName email role");

    res.json({ vehicles });
  } catch (error) {
    next(error);
  }
};

export const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate("userId", "fullName email role");

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (!isOwner(vehicle, req.user)) {
      return res.status(403).json({ message: "You don't have permission to perform this action" });
    }

    res.json({ vehicle });
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (!isOwner(vehicle, req.user)) {
      return res.status(403).json({ message: "You don't have permission to perform this action" });
    }

    const allowedFields = [
      "vehicleName",
      "registrationNumber",
      "manufacturer",
      "modelYear",
      "fuelType",
      "fuelEfficiency",
      "fuelTankCapacity",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vehicle[field] = req.body[field];
      }
    });

    if (req.body.modelYear !== undefined && !isValidYear(req.body.modelYear)) {
      return res.status(400).json({ message: "Please provide a valid model year" });
    }

    if (req.body.fuelEfficiency !== undefined && !isPositiveNumber(req.body.fuelEfficiency)) {
      return res.status(400).json({ message: "Please provide a valid fuel efficiency value" });
    }

    if (req.body.fuelTankCapacity !== undefined && !isPositiveNumber(req.body.fuelTankCapacity)) {
      return res.status(400).json({ message: "Please provide a valid fuel tank capacity" });
    }

    if (req.body.vehicleName !== undefined) vehicle.vehicleName = String(req.body.vehicleName).trim();
    if (req.body.registrationNumber !== undefined) vehicle.registrationNumber = String(req.body.registrationNumber).trim();
    if (req.body.manufacturer !== undefined) vehicle.manufacturer = String(req.body.manufacturer).trim();

    await vehicle.save();
    if (req.body.fuelType !== undefined || req.body.fuelEfficiency !== undefined) {
      await syncNotificationsForVehicle(vehicle.userId, vehicle._id);
    }

    res.json({
      message: "Vehicle details updated successfully",
      vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (!isOwner(vehicle, req.user)) {
      return res.status(403).json({ message: "You don't have permission to perform this action" });
    }

    const [hasFuelRecords, hasTrips] = await Promise.all([
      FuelRecord.exists({ vehicleId: vehicle._id }),
      Trip.exists({ vehicleId: vehicle._id }),
    ]);
    if (hasFuelRecords || hasTrips) {
      return res.status(409).json({ message: "Delete this vehicle's fuel records and trips before removing it." });
    }

    await vehicle.deleteOne();
    await syncNotificationsForVehicle(vehicle.userId, vehicle._id);

    res.json({ message: "Vehicle removed successfully" });
  } catch (error) {
    next(error);
  }
};
