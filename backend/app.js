import express from "express";

import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import fuelRecordRoutes from "./routes/fuelRecordRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.origin;

  if (!requestOrigin || allowedOrigins.length === 0 || allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  }

  return res.status(403).json({ message: "Cross-origin request blocked" });
});

app.get("/", (req, res) => {
  res.json({ message: "Smart Fuel Optimization API is running" });
});

app.use("/api", authRoutes);
app.use("/api", vehicleRoutes);
app.use("/api", fuelRecordRoutes);
app.use("/api", adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

