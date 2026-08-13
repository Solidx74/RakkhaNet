import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

let client: MongoClient | null = null;
let db: Db | null = null;

function getDatabaseConfig() {
  const uri = process.env.MONGODB_URI?.trim();
  const name = process.env.MONGODB_DB_NAME?.trim();

  if (process.env.NODE_ENV === "production" && (!uri || !name)) {
    throw new Error("[Configuration] MONGODB_URI and MONGODB_DB_NAME are required in production.");
  }

  return {
    uri: uri || "mongodb://127.0.0.1:27017/rakkhanet",
    name: name || "rakkhanet",
  };
}

export async function connectDB(): Promise<Db> {
  if (db) return db;

  try {
    const { uri, name } = getDatabaseConfig();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(name);
    console.log(`[Database] Successfully connected to MongoDB Atlas database: ${name}`);

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

export function isDatabaseConnected(): boolean {
  return db !== null;
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
