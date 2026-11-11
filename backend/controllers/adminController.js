import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import FuelRecord from "../models/FuelRecord.js";
import Trip from "../models/Trip.js";
import Budget from "../models/Budget.js";
import Notification from "../models/Notification.js";
import { isValidContactNumber, isValidEmail, isPositiveNumber, isValidYear } from "../utils/validation.js";
import { syncNotificationsForVehicle } from "../services/notificationService.js";

const isOwnAdminAccount = (req) =>
  String(req.params.id).toLowerCase() === String(req.user._id).toLowerCase();
const selfManageMessage = "You cannot manage your own account from Manage Users. Use Profile instead.";

// GET /api/admin-only
export const getAdminAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select("-password");
    res.json({ message: "Administrator access granted", user });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/stats
export const getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, totalAdmins, totalIndividuals, totalOrganizational,
      totalVehicles, petrolVehicles, dieselVehicles, electricVehicles,
      recentUsers, recentVehicles] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "Admin" }),
      User.countDocuments({ role: "Individual" }),
      User.countDocuments({ role: "Organizational" }),
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ fuelType: "Petrol" }),
      Vehicle.countDocuments({ fuelType: "Diesel" }),
      Vehicle.countDocuments({ fuelType: "Electric" }),
      User.find().select("fullName email role createdAt").sort({ createdAt: -1, _id: -1 }).limit(5),
      Vehicle.find().select("vehicleName registrationNumber fuelType userId createdAt")
        .sort({ createdAt: -1, _id: -1 }).limit(5).populate("userId", "fullName email"),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalAdmins,
        totalIndividuals,
        totalOrganizational,
        totalVehicles,
        petrolVehicles,
        dieselVehicles,
        electricVehicles,
      },
      recentUsers,
      recentVehicles,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users
export const getUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = { _id: { $ne: req.user._id } };

    if (search && String(search).trim()) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [{ fullName: regex }, { email: regex }, { contactNumber: regex }];
    }

    const users = await User.find(query)
      .select("fullName email contactNumber role createdAt updatedAt")
      .sort({ createdAt: -1, _id: -1 });

    // Aggregate vehicle count per user
    const vehicleCounts = await Vehicle.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);

    const countMap = vehicleCounts.reduce((acc, curr) => {
      acc[String(curr._id)] = curr.count;
      return acc;
    }, {});

    const usersWithCounts = users.map((u) => ({
      ...u.toObject(),
      vehicleCount: countMap[String(u._id)] || 0,
    }));

    res.json({ users: usersWithCounts });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users/:id
export const getUserById = async (req, res, next) => {
  try {
    if (isOwnAdminAccount(req)) {
      return res.status(400).json({ message: selfManageMessage });
    }
    const user = await User.findById(req.params.id)
      .select("fullName email contactNumber role createdAt updatedAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const vehicles = await Vehicle.find({ userId: user._id });

    res.json({
      user,
      vehicles,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/users/:id
export const updateUser = async (req, res, next) => {
  try {
    if (isOwnAdminAccount(req)) {
      return res.status(400).json({ message: selfManageMessage });
    }

    const { fullName, email, contactNumber, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (fullName !== undefined) {
      if (!String(fullName).trim()) {
        return res.status(400).json({ message: "Full name is required" });
      }
      user.fullName = String(fullName).trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      user.email = normalizedEmail;
    }

    if (contactNumber !== undefined) {
      if (!isValidContactNumber(String(contactNumber))) {
        return res.status(400).json({ message: "Please provide a valid contact number" });
      }
      user.contactNumber = String(contactNumber).trim();
    }

    if (role !== undefined) {
      if (!["Individual", "Organizational", "Admin"].includes(role)) {
        return res.status(400).json({ message: "Role must be Individual, Organizational, or Admin" });
      }
      user.role = role;
    }

    await user.save();

    res.json({
      message: "User updated successfully",
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        contactNumber: user.contactNumber,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res, next) => {
  try {
    if (isOwnAdminAccount(req)) {
      return res.status(400).json({ message: selfManageMessage });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove owned data before deleting the account so no inaccessible records remain.
    await Promise.all([
      FuelRecord.deleteMany({ userId: user._id }),
      Trip.deleteMany({ userId: user._id }),
      Budget.deleteMany({ userId: user._id }),
      Notification.deleteMany({ userId: user._id }),
    ]);
    await Vehicle.deleteMany({ userId: user._id });
    await user.deleteOne();

    res.json({ message: "User and associated records removed successfully" });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/vehicles
export const getAdminVehicles = async (req, res, next) => {
  try {
    const { search, fuelType } = req.query;
    let query = {};

    if (fuelType && fuelType !== "All") {
      query.fuelType = fuelType;
    }

    let vehicles = await Vehicle.find(query)
      .populate("userId", "fullName email contactNumber role")
      .sort({ createdAt: -1, _id: -1 });

    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      vehicles = vehicles.filter((v) => {
        const nameMatch = v.vehicleName?.toLowerCase().includes(q);
        const regMatch = v.registrationNumber?.toLowerCase().includes(q);
        const mfgMatch = v.manufacturer?.toLowerCase().includes(q);
        const ownerNameMatch = v.userId?.fullName?.toLowerCase().includes(q);
        const ownerEmailMatch = v.userId?.email?.toLowerCase().includes(q);
        return nameMatch || regMatch || mfgMatch || ownerNameMatch || ownerEmailMatch;
      });
    }

    res.json({ vehicles });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/vehicles/:id
export const updateAdminVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
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

    const updated = await Vehicle.findById(vehicle._id).populate("userId", "fullName email role");

    res.json({
      message: "Vehicle updated successfully",
      vehicle: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/vehicles/:id
export const deleteAdminVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
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
