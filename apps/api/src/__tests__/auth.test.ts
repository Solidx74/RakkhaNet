import { beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { ObjectId } from "mongodb";

process.env.JWT_SECRET = "rakkhanet_test_jwt_secret_2026";

const users: any[] = [];
const mockDb: any = {
  collection: () => ({
    findOne: async (query: any) => {
      if (query.$or) return users.find((user) => query.$or.some((condition: any) => user.email === condition.email || user.phone === condition.phone)) ?? null;
      if (query.email) return users.find((user) => user.email === query.email) ?? null;
      if (query._id) return users.find((user) => user._id.toString() === query._id.toString()) ?? null;
      return null;
    },
    insertOne: async (user: any) => {
      const _id = new ObjectId();
      users.push({ ...user, _id });
      return { insertedId: _id };
    },
  }),
};

vi.mock("../config/db", () => ({ getDB: () => mockDb }));

let app: express.Application;
const validUser = {
  name: "Rahim Uddin", email: "rahim@example.com", phone: "01712345678", password: "secure-password",
  division: "Dhaka", district: "Dhaka", upazila: "Mirpur",
};

beforeAll(async () => {
  const authRoutes = (await import("../routes/auth.routes")).default;
  app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
});

describe("Auth API", () => {
  it("signs up a valid user and rejects duplicate and invalid payloads", async () => {
    const created = await request(app).post("/api/auth/sign-up").send(validUser);
    expect(created.status).toBe(201);
    expect(created.body.data.token).toEqual(expect.any(String));

    expect((await request(app).post("/api/auth/sign-up").send(validUser)).status).toBe(409);
    expect((await request(app).post("/api/auth/sign-up").send({ email: "invalid" })).status).toBe(400);
  });

  it("signs in, exposes /me, and signs out", async () => {
    const signedIn = await request(app).post("/api/auth/sign-in").send({ email: validUser.email, password: validUser.password });
    expect(signedIn.status).toBe(200);
    const token = signedIn.body.data.token;

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(validUser.email);

    const signedOut = await request(app).post("/api/auth/sign-out").set("Authorization", `Bearer ${token}`);
    expect(signedOut.status).toBe(200);
    expect(signedOut.headers["set-cookie"]).toBeDefined();
  });

  it("rejects invalid credentials and unauthenticated profile access", async () => {
    expect((await request(app).post("/api/auth/sign-in").send({ email: validUser.email, password: "wrong-password" })).status).toBe(401);
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });
});
