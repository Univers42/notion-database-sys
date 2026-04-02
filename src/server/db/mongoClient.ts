// ─── MongoDB connection manager ──────────────────────────────────────────────
// Lazily connects on first use.  Falls back gracefully when the
// Docker container isn't running (all operations become no-ops).

import { MongoClient, type Db, type Collection, type Document } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;
let unavailable = false;
let lastAttempt = 0;
const RETRY_MS = 30_000;

function buildUri(): string {
  const user = process.env.MONGO_USER ?? 'notion_user';
  const pass = process.env.MONGO_PASSWORD ?? 'notion_pass';
  const host = process.env.MONGO_HOST ?? 'localhost';
  const port = process.env.MONGO_PORT ?? '27017';
  return `mongodb://${user}:${pass}@${host}:${port}/?authSource=admin`;
}

async function getDb(): Promise<Db | null> {
  if (unavailable && Date.now() - lastAttempt < RETRY_MS) return null;
  if (!db) {
    try {
      client = new MongoClient(buildUri(), {
        serverSelectionTimeoutMS: 3_000,
        connectTimeoutMS: 3_000,
      });
      await client.connect();
      const dbName = process.env.MONGO_DB ?? 'notion_db';
      db = client.db(dbName);
      unavailable = false;
    } catch {
      unavailable = true;
      lastAttempt = Date.now();
      client = null;
      db = null;
      return null;
    }
  }
  return db;
}

/** Get a MongoDB collection handle (or null when unreachable). */
export async function mongoCollection<T extends Document = Document>(
  name: string,
): Promise<Collection<T> | null> {
  const d = await getDb();
  return d ? d.collection<T>(name) : null;
}

/** Return all documents from a collection.  Returns null when unreachable. */
export async function mongoFindAll(
  collectionName: string,
): Promise<Record<string, unknown>[] | null> {
  try {
    const col = await mongoCollection(collectionName);
    if (!col) return null;
    return (await col.find({}).toArray()) as unknown as Record<string, unknown>[];
  } catch (err) {
    if (isConnectionError(err)) { markUnavailable(); return null; }
    throw err;
  }
}

/** Insert one document into a collection.  Returns null when container is down. */
export async function mongoInsert(
  collectionName: string,
  doc: Record<string, unknown>,
): Promise<{ acknowledged: boolean } | null> {
  try {
    const col = await mongoCollection(collectionName);
    if (!col) return null;
    const res = await col.insertOne(doc as Document);
    return { acknowledged: res.acknowledged };
  } catch (err) {
    if (isConnectionError(err)) { markUnavailable(); return null; }
    throw err;
  }
}

/** Delete one document by _id.  Returns null when container is down. */
export async function mongoDelete(
  collectionName: string,
  id: unknown,
): Promise<{ deletedCount: number } | null> {
  try {
    const col = await mongoCollection(collectionName);
    if (!col) return null;
    const res = await col.deleteOne({ _id: id } as Document);
    return { deletedCount: res.deletedCount };
  } catch (err) {
    if (isConnectionError(err)) { markUnavailable(); return null; }
    throw err;
  }
}

/** Update fields in a document.  Returns null when container is down. */
export async function mongoUpdate(
  collectionName: string,
  id: unknown,
  fields: Record<string, unknown>,
): Promise<{ modifiedCount: number } | null> {
  try {
    const col = await mongoCollection(collectionName);
    if (!col) return null;
    const res = await col.updateOne(
      { _id: id } as Document,
      { $set: { ...fields, updated_at: new Date(), last_edited_by: 'app' } },
    );
    return { modifiedCount: res.modifiedCount };
  } catch (err) {
    if (isConnectionError(err)) { markUnavailable(); return null; }
    throw err;
  }
}

/** Check if MongoDB is reachable. */
export async function mongoPing(): Promise<boolean> {
  try {
    const d = await getDb();
    if (!d) return false;
    await d.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

/** Gracefully close the connection. */
export async function mongoEnd(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isConnectionError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? '');
  return (
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('Server selection timed out')
  );
}

function markUnavailable(): void {
  unavailable = true;
  lastAttempt = Date.now();
  client = null;
  db = null;
}
