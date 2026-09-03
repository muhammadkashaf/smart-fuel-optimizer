import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isValidContactNumber, isValidEmail } from "../utils/validation.js";

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const register = async (req, res, next) => {
  try {
    const { fullName, email, contactNumber, role, password } = req.body;

    if (!fullName || !email || !contactNumber || !role || !password) {
      return res.status(400).json({ message: "Please complete all required fields" });
    }

    if (!["Individual", "Admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be either Individual or Admin" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (!isValidContactNumber(String(contactNumber))) {
      return res.status(400).json({ message: "Please provide a valid contact number" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email address already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      contactNumber,
      role,
      password: hashedPassword,
    });

    const token = createToken(user._id);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        contactNumber: user.contactNumber,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter your email address and password" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    const token = createToken(user._id);

    res.json({
      message: "You have been signed in successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        contactNumber: user.contactNumber,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  return res.json({ message: "You have been signed out successfully" });
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email, contactNumber, password } = req.body;
    const updates = {};

    if (fullName !== undefined) updates.fullName = String(fullName).trim();

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email address already exists" });
      }

      updates.email = normalizedEmail;
    }

    if (contactNumber !== undefined) {
      if (!isValidContactNumber(String(contactNumber))) {
        return res.status(400).json({ message: "Please provide a valid contact number" });
      }

      updates.contactNumber = contactNumber;
    }

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Your profile has been updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};
