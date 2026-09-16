import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "rakkhanet-cache";
const DB_VERSION = 1;
const STORE_NAME = "cache";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getCacheDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function setCached<T>(key: string, data: T): Promise<void> {
  const db = await getCacheDb();
  await db.put(STORE_NAME, { data, cachedAt: Date.now() }, key);
}

export async function getCached<T>(
  key: string,
): Promise<{ data: T; cachedAt: number } | null> {
  const db = await getCacheDb();
  const result = await db.get(STORE_NAME, key);
  return result ?? null;
}
