import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

const PORT = 5001;
const adminPassword = "E2E_Admin_1234";
let memoryServer: MongoMemoryServer | null = null;

async function seedFixtures(uri: string) {
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const database = client.db("rakkhanet_e2e");
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await database.collection("users").insertOne({
      name: "E2E Administrator",
      email: "e2e-admin@rakkhanet.test",
      phone: "01712345678",
      passwordHash,
      role: "ADMIN",
      division: "Chattogram",
      district: "Chattogram",
      upazila: "Patenga",
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await database.collection("shelters").insertOne({
      name: "Patenga Coastal Cyclone Shelter",
      code: "CTG-E2E-001",
      location: { type: "Point", coordinates: [91.8, 22.35] },
      address: "Patenga Sea Beach Road",
      division: "Chattogram",
      district: "Chattogram",
      upazila: "Patenga",
      capacity: 800,
      currentOccupancy: 120,
      status: "OPEN",
      amenities: {
        hasCleanWater: true,
        hasElectricity: true,
        hasGenerator: true,
        hasMedicalFacility: true,
        separateWomenSpace: true,
      },
      contactPerson: { name: "E2E Shelter Officer", phone: "01712345678" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await database.collection("risk_zones").insertOne({
      title: "Sunamganj Surma River Basin Inundation Zone",
      district: "Sunamganj",
      division: "Sylhet",
      disasterType: "FLOOD",
      riskLevel: "HIGH",
      riskScore: 76,
      rainfallMm24h: 80,
      riverWaterLevelMeters: 4.2,
      elevationMeters: 3,
      geometry: {
        type: "Polygon",
        coordinates: [[[91.35, 25.05], [91.65, 25.05], [91.65, 25.25], [91.35, 25.25], [91.35, 25.05]]],
      },
      affectedPopEstimate: 25000,
      isActive: true,
      updatedBy: "E2E_FIXTURE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } finally {
    await client.close();
  }
}

async function waitForApi() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (response.ok) return;
    } catch {
      // The application is still initializing its MongoDB connection.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the E2E API server to become healthy.");
}

async function shutdown() {
  const { httpServer } = await import("./index");
  const { closeDB } = await import("./config/db");
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await closeDB();
  await memoryServer?.stop();
}

async function main() {
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();

  process.env.NODE_ENV = "test-e2e";
  process.env.PORT = String(PORT);
  process.env.CLIENT_URL = "http://localhost:3000";
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB_NAME = "rakkhanet_e2e";
  process.env.JWT_SECRET = "rakkhanet_e2e_jwt_secret_only_for_tests";
  process.env.BETTER_AUTH_SECRET = "rakkhanet_e2e_better_auth_secret_only_for_tests";

  await seedFixtures(uri);
  await import("./index");
  await waitForApi();
  console.log("[E2E API] READY");
}

void main().catch((error) => {
  console.error("[E2E API] Startup failed", error);
  process.exitCode = 1;
});

process.once("SIGTERM", () => void shutdown().finally(() => process.exit()));
process.once("SIGINT", () => void shutdown().finally(() => process.exit()));
