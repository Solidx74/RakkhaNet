import { connectDB, closeDB } from "../config/db";
import { calculateRiskScore } from "@rakkhanet/shared-types";

const bangladeshRiskZones = [
  {
    title: "Sunamganj Surma River Basin Inundation Zone",
    district: "Sunamganj",
    division: "Sylhet",
    disasterType: "FLOOD",
    rainfallMm24h: 240,
    riverWaterLevelMeters: 3.8,
    elevationMeters: 2,
    warningLevel: "Danger Level 3 — Flash Flood Alert",
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
  },
  {
    title: "Cox's Bazar Coastal Cyclone & Surge Warning Belt",
    district: "Cox's Bazar",
    division: "Chattogram",
    disasterType: "STORM_SURGE",
    rainfallMm24h: 180,
    riverWaterLevelMeters: 2.5,
    elevationMeters: 3,
    warningLevel: "Great Danger Signal No. 10",
    affectedPopEstimate: 210000,
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
  },
  {
    title: "Bhola Island Central Coastal Buffer Zone",
    district: "Bhola",
    division: "Barishal",
    disasterType: "CYCLONE",
    rainfallMm24h: 150,
    riverWaterLevelMeters: 2.1,
    elevationMeters: 2,
    warningLevel: "Signal No. 8 Severe Cyclone Warning",
    affectedPopEstimate: 180000,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [90.45, 22.85],
          [90.80, 22.85],
          [90.80, 22.45],
          [90.45, 22.45],
          [90.45, 22.85],
        ],
      ],
    },
  },
  {
    title: "Patenga Coastal High Risk Surge Zone",
    district: "Chattogram",
    division: "Chattogram",
    disasterType: "STORM_SURGE",
    rainfallMm24h: 140,
    riverWaterLevelMeters: 1.8,
    elevationMeters: 4,
    warningLevel: "Danger Signal No. 7",
    affectedPopEstimate: 125000,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [91.70, 22.35],
          [91.90, 22.35],
          [91.90, 22.15],
          [91.70, 22.15],
          [91.70, 22.35],
        ],
      ],
    },
  },
  {
    title: "Satkhira Sundarbans Coastal Saline Flood Zone",
    district: "Satkhira",
    division: "Khulna",
    disasterType: "FLOOD",
    rainfallMm24h: 110,
    riverWaterLevelMeters: 1.2,
    elevationMeters: 3,
    warningLevel: "Moderate Flood Warning",
    affectedPopEstimate: 95000,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [88.95, 22.45],
          [89.20, 22.45],
          [89.20, 22.20],
          [88.95, 22.20],
          [88.95, 22.45],
        ],
      ],
    },
  },
  {
    title: "Kurigram Dharla & Brahmaputra Basin Inundation Zone",
    district: "Kurigram",
    division: "Rangpur",
    disasterType: "FLOOD",
    rainfallMm24h: 195,
    riverWaterLevelMeters: 2.9,
    elevationMeters: 5,
    warningLevel: "Severe River Bank Overflow",
    affectedPopEstimate: 160000,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [89.50, 25.95],
          [89.80, 25.95],
          [89.80, 25.65],
          [89.50, 25.65],
          [89.50, 25.95],
        ],
      ],
    },
  },
  {
    title: "Sirajganj Jamuna Buffer Flood Zone",
    district: "Sirajganj",
    division: "Rajshahi",
    disasterType: "FLOOD",
    rainfallMm24h: 100,
    riverWaterLevelMeters: 1.4,
    elevationMeters: 6,
    warningLevel: "Moderate Inundation Watch",
    affectedPopEstimate: 78000,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [89.55, 24.60],
          [89.80, 24.60],
          [89.80, 24.30],
          [89.55, 24.30],
          [89.55, 24.60],
        ],
      ],
    },
  },
  {
    title: "Dhaka Low-Lying Drainage Inundation Zone",
    district: "Dhaka",
    division: "Dhaka",
    disasterType: "FLOOD",
    rainfallMm24h: 65,
    riverWaterLevelMeters: 0.5,
    elevationMeters: 8,
    warningLevel: "Low Urban Waterlogging Watch",
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
  },
];

async function seed() {
  console.log("[Seed Risk Zones] Connecting to MongoDB...");
  const db = await connectDB();

  console.log("[Seed Risk Zones] Clearing existing risk_zones collection...");
  await db.collection("risk_zones").deleteMany({});

  console.log("[Seed Risk Zones] Computing heuristic scores and inserting 8 disaster risk zones...");
  const zonesToInsert = bangladeshRiskZones.map((z) => {
    const scoring = calculateRiskScore({
      rainfallMm24h: z.rainfallMm24h,
      riverWaterLevelMeters: z.riverWaterLevelMeters,
      elevationMeters: z.elevationMeters,
    });

    return {
      ...z,
      riskScore: scoring.riskScore,
      riskLevel: scoring.riskLevel,
      isActive: true,
      updatedBy: "SYSTEM_SEED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const result = await db.collection("risk_zones").insertMany(zonesToInsert);
  console.log(`[Seed Risk Zones] Successfully seeded ${result.insertedCount} disaster risk zones!`);

  // Verify 2dsphere index on geometry
  const indexes = await db.collection("risk_zones").indexes();
  console.log("[Seed Risk Zones] Verified Risk Zones Collection Indexes:\n", JSON.stringify(indexes, null, 2));

  await closeDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed Risk Zones] Error during seeding:", err);
  process.exit(1);
});
