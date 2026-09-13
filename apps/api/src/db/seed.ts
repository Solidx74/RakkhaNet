import "dotenv/config";
import { connectToDatabase, closeDatabase } from "./connection.js";
import type {
  ShelterCreateInput,
  RiskZoneCreateInput,
} from "@rakkhanet/shared-types";

const shelters: ShelterCreateInput[] = [
  {
    name: "Chattogram Government College Shelter",
    location: { type: "Point", coordinates: [91.8317, 22.3569] }, // [lng, lat]
    address: "Enayet Bazar, Chattogram",
    capacity: 500,
    currentOccupancy: 120,
    resources: [
      { type: "food", available: true },
      { type: "water", available: true },
      { type: "medicine", available: false },
    ],
    contactPerson: "Md. Alam",
    contactPhone: "+8801700000001",
    status: "open",
  },
  {
    name: "Sonagazi Union Primary School Shelter",
    location: { type: "Point", coordinates: [91.4372, 22.8494] },
    address: "Sonagazi, Feni",
    capacity: 200,
    currentOccupancy: 200,
    resources: [{ type: "food", available: false }],
    contactPerson: "Rina Begum",
    status: "full",
  },
];

const riskZones: RiskZoneCreateInput[] = [
  {
    region: "Sonagazi, Feni",
    hazardType: "flood",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [91.42, 22.84],
          [91.46, 22.84],
          [91.46, 22.87],
          [91.42, 22.87],
          [91.42, 22.84], // closes the ring -- first and last point must match
        ],
      ],
    },
    riskLevel: "high",
    riskScore: 78,
    inputs: { rainfallMm: 210, riverLevelM: 6.4, elevationM: 3.1 },
  },
];

async function seed() {
  const db = await connectToDatabase();

  await db.collection("shelters").deleteMany({});
  await db
    .collection("shelters")
    .insertMany(
      shelters.map((s) => ({
        ...s,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );

  await db.collection("risk_zones").deleteMany({});
  await db
    .collection("risk_zones")
    .insertMany(riskZones.map((z) => ({ ...z, lastUpdated: new Date() })));

  // 2dsphere indexes -- required for $near/$geoWithin geospatial queries.
  // Safe to call every seed run; createIndex is a no-op if it already exists
  // with the same spec.
  await db.collection("shelters").createIndex({ location: "2dsphere" });
  await db.collection("risk_zones").createIndex({ geometry: "2dsphere" });

  console.log(
    `[seed] inserted ${shelters.length} shelters, ${riskZones.length} risk zones, indexes created`,
  );
  await closeDatabase();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
