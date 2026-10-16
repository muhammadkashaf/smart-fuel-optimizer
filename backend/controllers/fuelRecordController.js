import mongoose from "mongoose";
import FuelRecord from "../models/FuelRecord.js";
import Vehicle from "../models/Vehicle.js";
import { periodFromDate, syncBudgetExceededNotification } from "../services/notificationService.js";

const isValidId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

const parseDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : null;
};

const validQuantity = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const validCost = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const ownerId = (user) => user._id;

const findOwnedVehicle = (vehicleId, user) =>
  Vehicle.findOne({ _id: vehicleId, userId: ownerId(user) });

const populateVehicle = (query) => query.populate("vehicleId", "vehicleName registrationNumber");

export const createFuelRecord = async (req, res, next) => {
  try {
    const { vehicleId, date, quantity, cost } = req.body;
    if (!vehicleId) return res.status(400).json({ message: "Vehicle is required" });
    if (!isValidId(vehicleId)) return res.status(400).json({ message: "Vehicle ID is invalid" });
    const parsedDate = parseDate(date);
    if (!parsedDate) return res.status(400).json({ message: "Enter a valid date (YYYY-MM-DD)" });
    if (!validQuantity(quantity)) return res.status(400).json({ message: "Quantity must be greater than 0" });
    if (!validCost(cost)) return res.status(400).json({ message: "Cost must be zero or greater" });

    const vehicle = await findOwnedVehicle(vehicleId, req.user);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const created = await FuelRecord.create({
      userId: ownerId(req.user),
      vehicleId: vehicle._id,
      date: parsedDate,
      quantity,
      cost,
    });
    const record = await populateVehicle(FuelRecord.findById(created._id));
    const period = periodFromDate(created.date);
    await syncBudgetExceededNotification(req.user._id, period.year, period.month);
    res.status(201).json({ message: "Fuel record added successfully", record });
  } catch (error) {
    next(error);
  }
};

export const getFuelRecords = async (req, res, next) => {
  try {
    const { vehicleId } = req.query;
    if (vehicleId !== undefined && !isValidId(vehicleId)) {
      return res.status(400).json({ message: "Vehicle ID is invalid" });
    }

    if (vehicleId && !(await findOwnedVehicle(vehicleId, req.user))) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const vehicles = vehicleId
      ? [new mongoose.Types.ObjectId(vehicleId)]
      : (await Vehicle.find({ userId: ownerId(req.user) }).select("_id")).map((v) => v._id);
    const records = await populateVehicle(
      FuelRecord.find({ userId: ownerId(req.user), vehicleId: { $in: vehicles } }).sort({ date: -1, createdAt: -1 })
    );
    res.json({ records });
  } catch (error) {
    next(error);
  }
};

export const getFuelRecordById = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Fuel record ID is invalid" });
    const record = await FuelRecord.findOne({ _id: req.params.id, userId: ownerId(req.user) });
    if (!record || !(await findOwnedVehicle(record.vehicleId, req.user))) {
      return res.status(404).json({ message: "Fuel record not found" });
    }
    await record.populate("vehicleId", "vehicleName registrationNumber");
    res.json({ record });
  } catch (error) {
    next(error);
  }
};

export const updateFuelRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Fuel record ID is invalid" });
    const record = await FuelRecord.findOne({ _id: req.params.id, userId: ownerId(req.user) });
    if (!record) return res.status(404).json({ message: "Fuel record not found" });
    if (!(await findOwnedVehicle(record.vehicleId, req.user))) {
      return res.status(404).json({ message: "Fuel record not found" });
    }

    const { vehicleId, date, quantity, cost } = req.body;
    const oldPeriod = periodFromDate(record.date);
    if (vehicleId !== undefined) {
      if (!isValidId(vehicleId)) return res.status(400).json({ message: "Vehicle ID is invalid" });
      const vehicle = await findOwnedVehicle(vehicleId, req.user);
      if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
      record.vehicleId = vehicle._id;
    }
    if (date !== undefined) {
      const parsedDate = parseDate(date);
      if (!parsedDate) return res.status(400).json({ message: "Enter a valid date (YYYY-MM-DD)" });
      record.date = parsedDate;
    }
    if (quantity !== undefined) {
      if (!validQuantity(quantity)) return res.status(400).json({ message: "Quantity must be greater than 0" });
      record.quantity = quantity;
    }
    if (cost !== undefined) {
      if (!validCost(cost)) return res.status(400).json({ message: "Cost must be zero or greater" });
      record.cost = cost;
    }

    await record.save();
    const newPeriod = periodFromDate(record.date);
    await syncBudgetExceededNotification(req.user._id, oldPeriod.year, oldPeriod.month);
    if (oldPeriod.year !== newPeriod.year || oldPeriod.month !== newPeriod.month) {
      await syncBudgetExceededNotification(req.user._id, newPeriod.year, newPeriod.month);
    }
    await record.populate("vehicleId", "vehicleName registrationNumber");
    res.json({ message: "Fuel record updated successfully", record });
  } catch (error) {
    next(error);
  }
};

export const deleteFuelRecord = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Fuel record ID is invalid" });
    const record = await FuelRecord.findOne({ _id: req.params.id, userId: ownerId(req.user) });
    if (!record || !(await findOwnedVehicle(record.vehicleId, req.user))) {
      return res.status(404).json({ message: "Fuel record not found" });
    }
    const period = periodFromDate(record.date);
    await record.deleteOne();
    await syncBudgetExceededNotification(req.user._id, period.year, period.month);
    res.json({ message: "Fuel record removed successfully" });
  } catch (error) {
    next(error);
  }
};
