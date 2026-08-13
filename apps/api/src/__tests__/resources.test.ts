import { beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const secret = "rakkhanet_resource_test_jwt";
process.env.JWT_SECRET = secret;
const items: any[] = [];
const mockDb: any = {
  collection: () => ({
    find: (query: any) => ({ toArray: async () => items.filter((item) => item.shelterId === query.shelterId) }),
    insertOne: async (item: any) => { const _id = new ObjectId(); items.push({ ...item, _id }); return { insertedId: _id }; },
    findOneAndUpdate: async (query: any, update: any) => {
      const item = items.find((entry) => entry._id.toString() === query._id.toString());
      return item ? Object.assign(item, update.$set) : null;
    },
    deleteOne: async (query: any) => { const index = items.findIndex((entry) => entry._id.toString() === query._id.toString()); if (index < 0) return { deletedCount: 0 }; items.splice(index, 1); return { deletedCount: 1 }; },
  }),
};
vi.mock("../config/db", () => ({ getDB: () => mockDb }));
let app: express.Application;
const tokenFor = (role: string) => jwt.sign({ id: "user-1", email: `${role}@example.com`, role }, secret);
const resource = { shelterId: "shelter-1", category: "DRY_FOOD", itemName: "Rice", totalQuantity: 50, unit: "kg" };

beforeAll(async () => {
  const resourceRoutes = (await import("../routes/resources.routes")).default;
  app = express(); app.use(express.json()); app.use("/api/resources", resourceRoutes);
});

describe("Resources API RBAC", () => {
  it("rejects unauthenticated and citizen access", async () => {
    expect((await request(app).get("/api/resources?shelterId=shelter-1")).status).toBe(401);
    expect((await request(app).post("/api/resources").set("Authorization", `Bearer ${tokenFor("CITIZEN")}`).send(resource)).status).toBe(403);
  });

  it("allows volunteers to view but not modify resources", async () => {
    expect((await request(app).get("/api/resources?shelterId=shelter-1").set("Authorization", `Bearer ${tokenFor("VOLUNTEER")}`)).status).toBe(200);
    expect((await request(app).post("/api/resources").set("Authorization", `Bearer ${tokenFor("VOLUNTEER")}`).send(resource)).status).toBe(403);
  });

  it("allows coordinator CRUD", async () => {
    const created = await request(app).post("/api/resources").set("Authorization", `Bearer ${tokenFor("COORDINATOR")}`).send(resource);
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    expect((await request(app).patch(`/api/resources/${id}`).set("Authorization", `Bearer ${tokenFor("COORDINATOR")}`).send({ totalQuantity: 75 })).status).toBe(200);
    expect((await request(app).delete(`/api/resources/${id}`).set("Authorization", `Bearer ${tokenFor("COORDINATOR")}`)).status).toBe(200);
  });
});
