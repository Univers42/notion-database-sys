// ─── PostgreSQL connection pool ──────────────────────────────────────────────
// Lazily creates a pg.Pool on first use.  Falls back gracefully when the
// Docker container isn't running (all queries become no-ops).

import pg from 'pg';

const { Pool } = pg;

let pool: InstanceType<typeof Pool> | null = null;
let unavailable = false;
let lastAttempt = 0;
const RETRY_MS = 30_000; // retry connection every 30 s after failure

function getPool(): InstanceType<typeof Pool> | null {
  if (unavailable && Date.now() - lastAttempt < RETRY_MS) return null;
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      user: process.env.POSTGRES_USER ?? 'notion_user',
      password: process.env.POSTGRES_PASSWORD ?? 'notion_pass',
      database: process.env.POSTGRES_DB ?? 'notion_db',
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 3_000,
    });
    pool.on('error', () => {
      unavailable = true;
      lastAttempt = Date.now();
      pool = null;
    });
  }
  return pool;
}

/** Execute a SQL query against the running PostgreSQL container.
 *  Returns `null` when the container is unreachable. */
export async function pgQuery(
  sql: string,
  params: unknown[] = [],
): Promise<{ rowCount: number } | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const res = await p.query(sql, params);
    unavailable = false;
    return { rowCount: res.rowCount ?? 0 };
  } catch (err) {
    const code = (err as Record<string, string>).code;
    // ECONNREFUSED / ENOTFOUND → container not running
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
      unavailable = true;
      lastAttempt = Date.now();
      pool = null;
      return null;
    }
    // Actual SQL error — rethrow so the caller can log it
    throw err;
  }
}

/** Check if PostgreSQL is reachable. */
export async function pgPing(): Promise<boolean> {
  try {
    const res = await pgQuery('SELECT 1');
    return res !== null;
  } catch {
    return false;
  }
}

/** Gracefully shut down the pool. */
export async function pgEnd(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
