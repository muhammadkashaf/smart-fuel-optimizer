import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication token is required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    User.findById(decoded.id)
      .select("_id fullName email contactNumber role")
      .then((user) => {
        if (!user) {
          return res.status(401).json({ message: "We could not verify your account" });
        }

        req.user = user;
        next();
      })
      .catch((error) => next(error));
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Your session is invalid or expired. Sign in again." });
    }
    return next(error);
  }
};

export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You don't have permission to perform this action" });
    }
    next();
  };
};
