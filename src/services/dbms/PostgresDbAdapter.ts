// ─── PostgreSQL Database Adapter ─────────────────────────────────────────────
// Connects to PostgreSQL and performs CRUD on tables.

import pg from 'pg';
import type { DbAdapter, DbConnectionConfig, DbEntitySchema, DbRecord } from './types.ts';
import { DbMemoCache } from './DbMemoCache.ts';
import { inferSchema } from './inferSchema.ts';

const { Pool } = pg;

/** PostgreSQL OID → simplified field type. */
function pgTypeToFieldType(dataType: string): 'string' | 'number' | 'boolean' | 'date' | 'array' | 'unknown' {
  const lower = dataType.toLowerCase();
  if (['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision'].includes(lower)) return 'number';
  if (lower === 'boolean') return 'boolean';
  if (['timestamp', 'timestamptz', 'date', 'timestamp without time zone', 'timestamp with time zone'].includes(lower)) return 'date';
  if (lower === 'array' || lower.startsWith('_') || lower.endsWith('[]')) return 'array';
  if (['varchar', 'text', 'character varying', 'char', 'uuid'].includes(lower)) return 'string';
  return 'unknown';
}

export class PostgresDbAdapter implements DbAdapter {
  readonly sourceName = 'PostgreSQL';
  readonly sourceType = 'postgresql' as const;

  private pool: InstanceType<typeof Pool> | null = null;
  private readonly connectionString: string;
  private readonly cache = new DbMemoCache();

  constructor(config: DbConnectionConfig) {
    if (!config.databaseUrl) throw new Error('PostgresDbAdapter requires databaseUrl');
    this.connectionString = config.databaseUrl;
  }

  async connect(): Promise<void> {
    if (this.pool) return;
    this.pool = new Pool({ connectionString: this.connectionString });
    // Verify the connection works
    const client = await this.pool.connect();
    client.release();
  }

  async disconnect(): Promise<void> {
    this.cache.clear();
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async listEntities(): Promise<string[]> {
    this.ensureConnected();
    const cached = this.cache.get<string[]>('entities');
    if (cached) return cached;

    const result = await this.pool!.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    const names = result.rows.map((r: Record<string, unknown>) => r.table_name as string);
    this.cache.set('entities', names);
    return names;
  }

  async getRecords(entity: string): Promise<DbRecord[]> {
    this.ensureConnected();
    const key = `records:${entity}`;
    const cached = this.cache.get<DbRecord[]>(key);
    if (cached) return cached;

    const result = await this.pool!.query(`SELECT * FROM "${entity}"`);
    const records = result.rows as DbRecord[];
    this.cache.set(key, records);
    return records;
  }

  async getRecord(entity: string, id: string): Promise<DbRecord | null> {
    this.ensureConnected();
    const result = await this.pool!.query(
      `SELECT * FROM "${entity}" WHERE id = $1 LIMIT 1`, [id],
    );
    return (result.rows[0] as DbRecord | undefined) ?? null;
  }

  async updateRecord(
    entity: string, id: string, field: string, value: unknown,
  ): Promise<DbRecord> {
    this.ensureConnected();
    const result = await this.pool!.query(
      `UPDATE "${entity}" SET "${field}" = $1 WHERE id = $2 RETURNING *`,
      [value, id],
    );
    if (result.rows.length === 0) {
      throw new Error(`Record ${id} not found in ${entity}`);
    }
    this.cache.invalidatePrefix(`records:${entity}`);
    return result.rows[0] as DbRecord;
  }

  async insertRecord(entity: string, record: Omit<DbRecord, 'id'>): Promise<DbRecord> {
    this.ensureConnected();
    const keys = Object.keys(record);
    const values = Object.values(record);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map((k) => `"${k}"`).join(', ');

    const result = await this.pool!.query(
      `INSERT INTO "${entity}" (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    this.cache.invalidatePrefix(`records:${entity}`);
    return result.rows[0] as DbRecord;
  }

  async getSchema(entity: string): Promise<DbEntitySchema> {
    this.ensureConnected();

    // Try native information_schema first for accurate types
    const colResult = await this.pool!.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [entity],
    );

    const countResult = await this.pool!.query(
      `SELECT count(*)::int AS cnt FROM "${entity}"`,
    );

    if (colResult.rows.length > 0) {
      return {
        entity,
        fields: colResult.rows.map((r: Record<string, string>) => ({
          name: r.column_name,
          type: pgTypeToFieldType(r.data_type),
          nullable: r.is_nullable === 'YES',
        })),
        recordCount: (countResult.rows[0] as { cnt: number }).cnt,
      };
    }

    // Fallback: infer from data
    const records = await this.getRecords(entity);
    return {
      entity,
      fields: inferSchema(records),
      recordCount: records.length,
    };
  }

  async ping(): Promise<boolean> {
    try {
      this.ensureConnected();
      await this.pool!.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private ensureConnected(): void {
    if (!this.pool) throw new Error('PostgresDbAdapter: not connected. Call connect() first.');
  }
}
