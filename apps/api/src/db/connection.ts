import { MongoClient, type Db } from "mongodb";

/**
 * Single shared MongoClient for the whole process. Express is a long-running
 * server (not serverless), so a plain module-level singleton is enough --
 * no need for the "cache on globalThis" dance you'd do in a Next.js API route.
 */
let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set -- check your .env file");
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db("rakkhanet-db"); // uses the database name embedded in the URI

  console.log("[db] connected to MongoDB");
  return db;
}

/** Call once at startup (see index.ts) then use this everywhere else. */
export function getDb(): Db {
  if (!db) {
    throw new Error(
      "Database not connected yet -- call connectToDatabase() before getDb()",
    );
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
}

/** The MongoClient itself -- Better Auth's adapter wants this, not just the Db. */
export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error("Mongo client not connected yet");
  }
  return client;
}
