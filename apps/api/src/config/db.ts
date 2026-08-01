import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/rakkhanet";
const DB_NAME = process.env.MONGODB_DB_NAME || "rakkhanet";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`[Database] Successfully connected to MongoDB Atlas database: ${DB_NAME}`);

    // Initialize 2dsphere indexes for geospatial collections asynchronously
    await initIndexes(db);

    return db;
  } catch (error) {
    console.error("[Database] MongoDB Connection Error:", error);
    throw error;
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error("[Database] DB not initialized. Call connectDB first.");
  }
  return db;
}

async function initIndexes(database: Db) {
  try {
    // 1. Shelters 2dsphere index on location
    await database.collection("shelters").createIndex({ location: "2dsphere" });

    // 2. Risk Zones 2dsphere index on geometry
    await database.collection("risk_zones").createIndex({ geometry: "2dsphere" });

    // 3. Relief Requests 2dsphere index on location
    await database.collection("relief_requests").createIndex({ location: "2dsphere" });

    // 4. User Unique Indexes
    await database.collection("users").createIndex({ email: 1 }, { unique: true });
    await database.collection("users").createIndex({ phone: 1 }, { unique: true });

    console.log("[Database] Geospatial & Unique indexes verified successfully.");
  } catch (err) {
    console.warn("[Database] Index initialization notice:", err);
  }
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("[Database] MongoDB Connection Closed.");
  }
}
