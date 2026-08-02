import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import express from "express";
import { ObjectId } from "mongodb";
import { calculateRiskScore } from "@rakkhanet/shared-types";

const JWT_SECRET = "rakkhanet_test_jwt_secret_2026";
process.env.JWT_SECRET = JWT_SECRET;

const mockRiskZones = [
  {
    _id: new ObjectId("66ab20000000000000000001"),
    title: "Sunamganj Flash Flood Zone",
    district: "Sunamganj",
    division: "Sylhet",
    disasterType: "FLOOD",
    riskLevel: "CRITICAL",
    riskScore: 92,
    rainfallMm24h: 240,
    riverWaterLevelMeters: 3.8,
    elevationMeters: 2,
    warningLevel: "Danger Level 3",
    affectedPopEstimate: 145000,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [91.55, 25.12],
          [91.82, 25.12],
          [91.82, 24.95],
          [91.55, 24.95],
          [91.55, 25.12],
        ],
      ],
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId("66ab20000000000000000002"),
    title: "Dhaka Low-Lying Drainage Zone",
    district: "Dhaka",
    division: "Dhaka",
    disasterType: "FLOOD",
    riskLevel: "LOW",
    riskScore: 32,
    rainfallMm24h: 40,
    riverWaterLevelMeters: 0.5,
    elevationMeters: 8,
    warningLevel: "Low Waterlogging",
    affectedPopEstimate: 45000,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [90.32, 23.88],
          [90.48, 23.88],
          [90.48, 23.72],
          [90.32, 23.72],
          [90.32, 23.88],
        ],
      ],
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const riskZonesStore = [...mockRiskZones];

const mockDb: any = {
  collection: (name: string) => ({
    indexes: async () => [{ key: { geometry: "2dsphere" } }],
    find: (query: any) => ({
      sort: () => ({
        toArray: async () => {
          let result = [...riskZonesStore];
          if (query.$or) {
            const regex = query.$or[0].district;
            result = result.filter(
              (z) =>
                regex.test(z.district) ||
                regex.test(z.division) ||
                regex.test(z.title)
            );
          }
          return result;
        },
      }),
    }),
    findOne: async (query: any) => {
      if (query._id) {
        return riskZonesStore.find((z) => z._id.toString() === query._id.toString()) || null;
      }
      return null;
    },
    insertOne: async (doc: any) => {
      const _id = new ObjectId();
      const newDoc = { _id, ...doc };
      riskZonesStore.push(newDoc);
      return { insertedId: _id };
    },
  }),
};

// Mock db config
vi.mock("../config/db", () => ({
  connectDB: async () => mockDb,
  getDB: () => mockDb,
  closeDB: async () => {},
}));

let app: express.Application;
let citizenToken: string;
let adminToken: string;

beforeAll(async () => {
  const authRoutes = (await import("../routes/auth.routes")).default;
  const riskZoneRoutes = (await import("../routes/risk-zones.routes")).default;

  app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/risk-zones", riskZoneRoutes);

  citizenToken = jwt.sign(
    { id: "c1", email: "citizen@example.com", role: "CITIZEN" },
    JWT_SECRET
  );
  adminToken = jwt.sign(
    { id: "a1", email: "admin@rakkhanet.gov.bd", role: "ADMIN" },
    JWT_SECRET
  );
});

describe("Risk Zones & Heuristic Scoring Unit/Integration Tests", () => {
  it("calculateRiskScore correctly scores CRITICAL severe flood inputs", () => {
    const result = calculateRiskScore({
      rainfallMm24h: 240,
      riverWaterLevelMeters: 3.8,
      elevationMeters: 2,
    });

    expect(result.riskScore).toBeGreaterThanOrEqual(85);
    expect(result.riskLevel).toBe("CRITICAL");
  });

  it("calculateRiskScore correctly scores LOW risk mild weather inputs", () => {
    const result = calculateRiskScore({
      rainfallMm24h: 20,
      riverWaterLevelMeters: 0.2,
      elevationMeters: 10,
    });

    expect(result.riskScore).toBeLessThan(45);
    expect(result.riskLevel).toBe("LOW");
  });

  it("GET /api/risk-zones?region=Sunamganj filters risk zones by region", async () => {
    const res = await request(app).get("/api/risk-zones?region=Sunamganj");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.riskZones.length).toBe(1);
    expect(res.body.data.riskZones[0].title).toBe("Sunamganj Flash Flood Zone");
  });

  it("POST /api/risk-zones rejects unauthorized citizen creation with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/risk-zones")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        title: "Unauthorized Hazard Zone",
        district: "Dhaka",
        division: "Dhaka",
        disasterType: "FLOOD",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [90.0, 23.0],
              [90.1, 23.0],
              [90.1, 23.1],
              [90.0, 23.1],
              [90.0, 23.0],
            ],
          ],
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/risk-zones allows ADMIN to create risk zone with heuristic calculation", async () => {
    const res = await request(app)
      .post("/api/risk-zones")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Cox's Bazar Storm Surge Belt",
        district: "Cox's Bazar",
        division: "Chattogram",
        disasterType: "STORM_SURGE",
        rainfallMm24h: 180,
        riverWaterLevelMeters: 2.5,
        elevationMeters: 3,
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [91.85, 21.60],
              [92.15, 21.60],
              [92.15, 21.20],
              [91.85, 21.20],
              [91.85, 21.60],
            ],
          ],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Cox's Bazar Storm Surge Belt");
    expect(res.body.data.riskScore).toBeGreaterThanOrEqual(70);
  });
});
