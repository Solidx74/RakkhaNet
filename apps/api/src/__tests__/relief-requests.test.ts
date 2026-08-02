import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import express from "express";
import { ObjectId } from "mongodb";
import { calculatePriorityScore } from "@rakkhanet/shared-types";

const JWT_SECRET = "rakkhanet_test_jwt_secret_2026";
process.env.JWT_SECRET = JWT_SECRET;

const mockRequests = [
  {
    _id: new ObjectId("66ab40000000000000000001"),
    requesterName: "Kamal Uddin",
    contactPhone: "01811223344",
    location: { type: "Point", coordinates: [91.80, 22.35] },
    addressDetails: "Patharghata Ward 3",
    category: "FOOD",
    urgency: "HIGH",
    peopleCount: 4,
    description: "Starving children here without food for two days.",
    status: "PENDING",
    aiPriorityScore: 80,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId("66ab40000000000000000002"),
    requesterName: "Rohima Begum",
    contactPhone: "01711223344",
    location: { type: "Point", coordinates: [91.75, 22.40] },
    addressDetails: "Halishahar Block B",
    category: "MEDICAL",
    urgency: "CRITICAL",
    peopleCount: 2,
    description: "Injured pregnant lady bleeding after cyclone storm surge.",
    status: "PENDING",
    aiPriorityScore: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockResources = [
  {
    _id: new ObjectId("66ab50000000000000000001"),
    shelterId: "shelter_1",
    category: "DRY_FOOD",
    itemName: "Muri Packet",
    totalQuantity: 500,
    allocatedQuantity: 100,
    unit: "packets",
    lastRestockedAt: new Date(),
  },
];

const reqStore = [...mockRequests];

const mockDb: any = {
  collection: (name: string) => ({
    countDocuments: async (query: any) => {
      if (name === "shelters") return 5;
      if (name === "risk_zones") return 3;
      return 0;
    },
    find: (query: any) => ({
      sort: () => ({
        toArray: async () => {
          let list: any[] = name === "resources" ? mockResources : reqStore;
          if (query.status) {
            list = list.filter((r: any) => r.status === query.status);
          }
          if (query.$or) {
            const regex = query.$or[0].addressDetails;
            list = list.filter((r: any) => regex.test(r.addressDetails) || regex.test(r.requesterName));
          }
          return list;
        },
      }),
    }),
    insertOne: async (doc: any) => {
      const _id = new ObjectId();
      const newDoc = { _id, ...doc };
      reqStore.push(newDoc);
      return { insertedId: _id };
    },
    aggregate: (pipeline: any[]) => ({
      toArray: async () => {
        if (name === "resources") {
          return [
            {
              _id: "DRY_FOOD",
              totalQuantity: 500,
              allocatedQuantity: 105,
            },
          ];
        }
        return [
          { _id: "PENDING", count: reqStore.filter(r => r.status === "PENDING").length },
          { _id: "ASSIGNED", count: reqStore.filter(r => r.status === "ASSIGNED").length },
        ];
      },
    }),
  }),
};

// Mock db config
vi.mock("../config/db", () => ({
  connectDB: async () => mockDb,
  getDB: () => mockDb,
  closeDB: async () => {},
}));

vi.mock("../config/socket", () => ({
  emitRealTimeEvent: vi.fn(),
}));

let app: express.Application;
let coordinatorToken: string;

beforeAll(async () => {
  const authRoutes = (await import("../routes/auth.routes")).default;
  const reliefRoutes = (await import("../routes/relief-requests.routes")).default;
  const dashboardRoutes = (await import("../routes/dashboard.routes")).default;

  app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/relief-requests", reliefRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  coordinatorToken = jwt.sign(
    { id: "co1", email: "coordinator@rakkhanet.org", role: "COORDINATOR" },
    JWT_SECRET
  );
});

describe("Relief Coordination & Priority Scoring Tests", () => {
  it("calculatePriorityScore flags critical keywords correctly", () => {
    const result = calculatePriorityScore(
      "Drowning baby here emergency help",
      "MEDIUM"
    );

    expect(result.priorityScore).toBe(60); // 45 + 15 = 60
    expect(result.urgency).toBe("MEDIUM");
  });

  it("POST /api/relief-requests successfully creates citizen aid request and auto-scores priority", async () => {
    const res = await request(app)
      .post("/api/relief-requests")
      .send({
        requesterName: "Citizen Rahim",
        contactPhone: "01799887766",
        location: { type: "Point", coordinates: [90.40, 23.80] },
        addressDetails: "Mirpur Section 10",
        category: "WATER",
        urgency: "HIGH",
        peopleCount: 3,
        description: "Severely thirsty. No clean drinking water available.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.aiPriorityScore).toBeGreaterThanOrEqual(70);
  });

  it("GET /api/relief-requests returns requests filtered by region query", async () => {
    const res = await request(app)
      .get("/api/relief-requests?region=Patharghata")
      .set("Authorization", `Bearer ${coordinatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requests.length).toBeGreaterThan(0);
    expect(res.body.data.requests[0].requesterName).toBe("Kamal Uddin");
  });

  it("GET /api/dashboard/stats aggregates pipeline metrics cleanly", async () => {
    const res = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${coordinatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reliefRequests.statusCounts).toBeDefined();
    expect(res.body.data.resources[0].category).toBe("DRY_FOOD");
  });
});
