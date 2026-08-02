import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import express from "express";
import { ObjectId } from "mongodb";

const JWT_SECRET = "rakkhanet_test_jwt_secret_2026";
process.env.JWT_SECRET = JWT_SECRET;

const mockShelter = {
  _id: new ObjectId("66ab30000000000000000001"),
  name: "Patenga Coastal Cyclone Shelter",
  code: "CTG-001",
  location: { type: "Point", coordinates: [91.7832, 22.2384] },
  address: "Sea Beach Road",
  division: "Chattogram",
  district: "Chattogram",
  upazila: "Patenga",
  capacity: 1000,
  currentOccupancy: 300,
  status: "OPEN",
  contactPerson: { name: "Ashraf Uddin", phone: "01819001122" },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDb: any = {
  collection: (name: string) => ({
    indexes: async () => [{ key: { location: "2dsphere" } }],
    findOne: async (query: any) => {
      if (query._id) {
        return mockShelter._id.toString() === query._id.toString() ? mockShelter : null;
      }
      return null;
    },
    aggregate: (pipeline: any[]) => ({
      toArray: async () => [mockShelter],
    }),
  }),
};

vi.mock("../config/db", () => ({
  connectDB: async () => mockDb,
  getDB: () => mockDb,
  closeDB: async () => {},
}));

let app: express.Application;
let citizenToken: string;

beforeAll(async () => {
  const authRoutes = (await import("../routes/auth.routes")).default;
  const evacuationRoutes = (await import("../routes/evacuation.routes")).default;

  app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/evacuation-route", evacuationRoutes);

  citizenToken = jwt.sign(
    { id: "c1", email: "citizen@example.com", role: "CITIZEN" },
    JWT_SECRET
  );
});

describe("Evacuation Guidance & OSRM Fallback Integration Tests", () => {
  it("GET /api/evacuation-route returns 400 when missing required coordinates", async () => {
    const res = await request(app)
      .get("/api/evacuation-route")
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/evacuation-route calculates route with fallback resiliency when OSRM API fails/times out", async () => {
    // Mock global fetch to throw network error simulating OSRM downtime
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection timeout"));

    const res = await request(app)
      .get(`/api/evacuation-route?fromLat=22.35&fromLng=91.80&shelterId=${mockShelter._id.toString()}`)
      .set("Authorization", `Bearer ${citizenToken}`);

    global.fetch = originalFetch;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.routeType).toBe("fallback");
    expect(res.body.data.geometry.type).toBe("LineString");
    expect(res.body.data.geometry.coordinates.length).toBe(2);
    expect(res.body.data.distanceMeters).toBeGreaterThan(0);
    expect(res.body.data.warnings.length).toBeGreaterThan(0);
    expect(res.body.data.destinationShelter.name).toBe("Patenga Coastal Cyclone Shelter");
  });

  it("GET /api/evacuation-route returns road route when OSRM responds successfully", async () => {
    const mockOsrmResponse = {
      code: "Ok",
      routes: [
        {
          distance: 12500,
          duration: 900,
          geometry: {
            type: "LineString",
            coordinates: [
              [91.80, 22.35],
              [91.79, 22.30],
              [91.7832, 22.2384],
            ],
          },
          legs: [
            {
              steps: [
                {
                  distance: 5000,
                  duration: 400,
                  name: "Marine Drive",
                  maneuver: { type: "turn", modifier: "right" },
                },
              ],
            },
          ],
        },
      ],
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOsrmResponse,
    } as any);

    const res = await request(app)
      .get(`/api/evacuation-route?fromLat=22.35&fromLng=91.80&shelterId=${mockShelter._id.toString()}`)
      .set("Authorization", `Bearer ${citizenToken}`);

    global.fetch = originalFetch;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.routeType).toBe("road");
    expect(res.body.data.distanceMeters).toBe(12500);
    expect(res.body.data.durationMinutes).toBe(15);
    expect(res.body.data.steps.length).toBe(1);
    expect(res.body.data.steps[0].name).toBe("Marine Drive");
  });
});
