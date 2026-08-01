import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import express from "express";
import { ObjectId } from "mongodb";

const JWT_SECRET = "rakkhanet_test_jwt_secret_2026";
process.env.JWT_SECRET = JWT_SECRET;

const mockShelters = [
  {
    _id: new ObjectId("66ab10000000000000000001"),
    name: "Patenga Coastal Cyclone Shelter",
    code: "CTG-001",
    location: { type: "Point", coordinates: [91.7832, 22.2384] }, // Patenga, Chattogram
    address: "Sea Beach Road",
    division: "Chattogram",
    district: "Chattogram",
    upazila: "Patenga",
    capacity: 1000,
    currentOccupancy: 300,
    status: "OPEN",
    amenities: {
      hasCleanWater: true,
      hasElectricity: true,
      hasGenerator: true,
      hasMedicalFacility: true,
      separateWomenSpace: true,
    },
    contactPerson: { name: "Ashraf Uddin", phone: "01819001122" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId("66ab10000000000000000002"),
    name: "Cox's Bazar Refuge Center",
    code: "CXB-002",
    location: { type: "Point", coordinates: [91.9796, 21.4272] }, // Cox's Bazar
    address: "Kalatali Road",
    division: "Chattogram",
    district: "Cox's Bazar",
    upazila: "Sadar",
    capacity: 800,
    currentOccupancy: 800,
    status: "FULL",
    amenities: {
      hasCleanWater: true,
      hasElectricity: true,
      hasGenerator: false,
      hasMedicalFacility: false,
      separateWomenSpace: true,
    },
    contactPerson: { name: "Saleh Ahmed", phone: "01711992233" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId("66ab10000000000000000003"),
    name: "Dhaka High School Emergency Shelter",
    code: "DHK-003",
    location: { type: "Point", coordinates: [90.4125, 23.8103] }, // Uttara, Dhaka
    address: "Sector 4",
    division: "Dhaka",
    district: "Dhaka",
    upazila: "Uttara",
    capacity: 2000,
    currentOccupancy: 500,
    status: "OPEN",
    amenities: {
      hasCleanWater: true,
      hasElectricity: true,
      hasGenerator: true,
      hasMedicalFacility: true,
      separateWomenSpace: true,
    },
    contactPerson: { name: "Tanvir Ahmed", phone: "01713334455" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const sheltersStore = [...mockShelters];

const mockDb: any = {
  collection: (name: string) => ({
    indexes: async () => [{ key: { location: "2dsphere" } }],
    aggregate: (pipeline: any[]) => ({
      toArray: async () => {
        const geoNearStage = pipeline.find((p) => p.$geoNear);
        if (geoNearStage) {
          const [userLng, userLat] = geoNearStage.$geoNear.near.coordinates;

          const withDistance = sheltersStore.map((s) => {
            const [sLng, sLat] = s.location.coordinates;
            const R = 6371e3;
            const φ1 = (userLat * Math.PI) / 180;
            const φ2 = (sLat * Math.PI) / 180;
            const Δφ = ((sLat - userLat) * Math.PI) / 180;
            const Δλ = ((sLng - userLng) * Math.PI) / 180;

            const a =
              Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceMeters = R * c;

            return { ...s, distanceMeters };
          });

          return withDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
        }
        return sheltersStore;
      },
    }),
    find: (query: any) => ({
      toArray: async () => {
        let result = [...sheltersStore];
        if (query.district) {
          result = result.filter((s) =>
            s.district.toLowerCase().includes(query.district.$regex.source.toLowerCase())
          );
        }
        return result;
      },
    }),
    findOne: async (query: any) => {
      if (query._id) {
        return sheltersStore.find((s) => s._id.toString() === query._id.toString()) || null;
      }
      return null;
    },
    insertOne: async (doc: any) => {
      const _id = new ObjectId();
      const newDoc = { _id, ...doc };
      sheltersStore.push(newDoc);
      return { insertedId: _id };
    },
    findOneAndUpdate: async (query: any, update: any) => {
      const index = sheltersStore.findIndex((s) => s._id.toString() === query._id.toString());
      if (index !== -1) {
        sheltersStore[index] = { ...sheltersStore[index], ...update.$set };
        return sheltersStore[index];
      }
      return null;
    },
  }),
};

// Mock db module
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
  const shelterRoutes = (await import("../routes/shelters.routes")).default;

  app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/shelters", shelterRoutes);

  citizenToken = jwt.sign(
    { id: "c1", email: "citizen@example.com", role: "CITIZEN" },
    JWT_SECRET
  );
  adminToken = jwt.sign(
    { id: "a1", email: "admin@rakkhanet.gov.bd", role: "ADMIN" },
    JWT_SECRET
  );
});

describe("Shelters API & Geospatial $near Integration Tests", () => {
  it("GET /api/shelters/nearby returns shelters ordered by distance from user location", async () => {
    // User located in Chattogram (22.35, 91.80)
    const res = await request(app)
      .get("/api/shelters/nearby?lat=22.35&lng=91.80&maxDistance=100000")
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shelters.length).toBeGreaterThan(0);

    const shelters = res.body.data.shelters;
    // Verify Patenga (Chattogram) is closer than Cox's Bazar and Dhaka
    expect(shelters[0].name).toBe("Patenga Coastal Cyclone Shelter");
    expect(shelters[0].distanceMeters).toBeLessThan(shelters[1].distanceMeters);
    expect(shelters[0].availableCapacity).toBe(700); // 1000 - 300
    expect(shelters[0].occupancyPercentage).toBe(30);
  });

  it("POST /api/shelters rejects unauthorized citizen request with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/shelters")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        name: "Unauthorized Shelter",
        location: { type: "Point", coordinates: [90.0, 23.0] },
        address: "Test Road",
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Sadar",
        capacity: 500,
        contactPerson: { name: "Test", phone: "01700000000" },
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/shelters allows ADMIN to create a new shelter", async () => {
    const res = await request(app)
      .post("/api/shelters")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Sylhet Flood Relief Station",
        code: "SYL-999",
        location: { type: "Point", coordinates: [91.8687, 24.8949] },
        address: "Zindabazar Road",
        division: "Sylhet",
        district: "Sylhet",
        upazila: "Sylhet Sadar",
        capacity: 1200,
        currentOccupancy: 100,
        status: "OPEN",
        amenities: {
          hasCleanWater: true,
          hasElectricity: true,
          hasGenerator: false,
          hasMedicalFacility: true,
          separateWomenSpace: true,
        },
        contactPerson: { name: "Kamrul Islam", phone: "01711223344" },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Sylhet Flood Relief Station");
  });

  it("PATCH /api/shelters/:id updates shelter occupancy and status", async () => {
    const targetId = "66ab10000000000000000001";
    const res = await request(app)
      .patch(`/api/shelters/${targetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        currentOccupancy: 950,
        status: "FULL",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currentOccupancy).toBe(950);
    expect(res.body.data.status).toBe("FULL");
  });
});
