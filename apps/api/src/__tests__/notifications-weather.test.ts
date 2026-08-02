import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import express from "express";
import { fetchWeatherData } from "../services/weather.service";
import { sendEmailAlert, smsProvider } from "../routes/notifications.routes";

const JWT_SECRET = process.env.JWT_SECRET || "rakkhanet_super_secret_jwt_key_2026";

const mockDb: any = {
  collection: (name: string) => ({
    find: (query: any) => ({
      toArray: async () => {
        if (name === "users") {
          return [
            { email: "user1@example.com", phone: "01711223344", district: "Sunamganj" },
            { email: "user2@example.com", phone: "01811223344", district: "Dhaka" },
          ];
        }
        return [];
      },
    }),
    insertOne: async (doc: any) => ({ insertedId: "notif_123" }),
  }),
};

vi.mock("../config/db", () => ({
  connectDB: async () => mockDb,
  getDB: () => mockDb,
  closeDB: async () => {},
}));

vi.mock("../config/socket", () => ({
  emitRealTimeEvent: vi.fn(),
}));

let app: express.Application;
let adminToken: string;

beforeAll(async () => {
  const notificationsRoutes = (await import("../routes/notifications.routes")).default;

  app = express();
  app.use(express.json());
  app.use("/api/notifications", notificationsRoutes);

  adminToken = jwt.sign(
    { id: "ad1", email: "admin@rakkhanet.gov.bd", role: "ADMIN" },
    JWT_SECRET
  );
});

describe("Alerts, Broadcasts & Weather Integration Tests", () => {
  it("Mock SMS provider logs correctly", async () => {
    const success = await smsProvider.sendSMS("01711223344", "Test SMS");
    expect(success).toBe(true);
  });

  it("POST /api/notifications/broadcast delivers alert via WebSocket channel", async () => {
    const res = await request(app)
      .post("/api/notifications/broadcast")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        targetDistrict: "Sunamganj",
        title: "Severe Flood Warning",
        message: "Prepare for immediate evacuation to safe shelters",
        channel: "IN_APP",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.targetDistrict).toBe("Sunamganj");
  });

  it("fetchWeatherData returns null on missing key or network downtime (resilience check)", async () => {
    // Force empty API key to trigger fallback
    const originalKey = process.env.OPENWEATHER_API_KEY;
    process.env.OPENWEATHER_API_KEY = "";

    const data = await fetchWeatherData(25.0, 91.5);
    process.env.OPENWEATHER_API_KEY = originalKey;

    expect(data).toBeNull();
  });
});
