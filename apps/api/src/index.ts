import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth.routes";
import shelterRoutes from "./routes/shelters.routes";
import riskZoneRoutes from "./routes/risk-zones.routes";
import evacuationRoutes from "./routes/evacuation.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Healthcheck Route
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    service: "RakkhaNet Express Core API",
    timestamp: new Date().toISOString(),
  });
});

// API Module Routes
app.use("/api/auth", authRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/risk-zones", riskZoneRoutes);
app.use("/api/evacuation-route", evacuationRoutes);

// Global 404 Route
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "API Route Not Found" });
});

// Start Server after connecting to MongoDB
if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[RakkhaNet API] Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("[RakkhaNet API] Failed to start server due to DB connection error:", err);
    });
}

export default app;
