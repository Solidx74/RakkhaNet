import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createServer } from "http";
import { connectDB, isDatabaseConnected } from "./config/db";
import { initSocket } from "./config/socket";
import { validateEnvironment } from "./config/env";
import { authLimiter } from "./middleware/rate-limiter.middleware";
import authRoutes from "./routes/auth.routes";
import shelterRoutes from "./routes/shelters.routes";
import riskZoneRoutes from "./routes/risk-zones.routes";
import evacuationRoutes from "./routes/evacuation.routes";
import reliefRequestsRoutes from "./routes/relief-requests.routes";
import resourcesRoutes from "./routes/resources.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import notificationsRoutes from "./routes/notifications.routes";

dotenv.config();
validateEnvironment();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
initSocket(httpServer);

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Healthcheck Route
app.get("/api/health", (_req, res) => {
  const databaseConnected = isDatabaseConnected();
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "online" : "degraded",
    service: "RakkhaNet Express Core API",
    database: databaseConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// API Module Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/risk-zones", riskZoneRoutes);
app.use("/api/evacuation-route", evacuationRoutes);
app.use("/api/relief-requests", reliefRequestsRoutes);
app.use("/api/resources", resourcesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationsRoutes);

// Global 404 Route
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "API Route Not Found" });
});

// Start Server after connecting to MongoDB
if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(() => {
      httpServer.listen(PORT, () => {
        console.log(`[RakkhaNet API] Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("[RakkhaNet API] Failed to start server due to DB connection error:", err);
    });
}

export { httpServer };
export default app;
