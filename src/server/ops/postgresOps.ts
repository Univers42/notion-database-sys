// ─── PostgreSQL query generator ──────────────────────────────────────────────
// Generates real SQL queries and applies them to the seed files.
// When the Docker PG container is running, queries are also executed live.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { markOwnWrite } from '../fileWatcher';
import type { DbmsAdapter, QueryResult } from './types';
import { PROP_TO_SQL } from './types';
import { sqlId, sqlLit } from './helpers';
import { logQuery } from './queryLog';
import { pgQuery } from '../db/pgPool';

const DIR = join(resolve(process.cwd()), 'src', 'store', 'dbms', 'relational');
const SEED_FILE = join(DIR, '002_seed.sql');
const SCHEMA_FILE = join(DIR, '001_schema.sql');

function appendToSeed(sql: string): void {
  if (!existsSync(SEED_FILE)) return;
  markOwnWrite(SEED_FILE);
  const existing = readFileSync(SEED_FILE, 'utf-8');
  writeFileSync(SEED_FILE, existing.trimEnd() + '\n\n' + sql + '\n', 'utf-8');
}

function appendToSchema(sql: string): void {
  if (!existsSync(SCHEMA_FILE)) return;
  markOwnWrite(SCHEMA_FILE);
  let content = readFileSync(SCHEMA_FILE, 'utf-8');
  // Insert before final COMMIT;
  const commitIdx = content.lastIndexOf('COMMIT;');
  if (commitIdx !== -1) {
    content = content.slice(0, commitIdx) + sql + '\n\n' + content.slice(commitIdx);
  } else {
    content += '\n' + sql + '\n';
  }
  writeFileSync(SCHEMA_FILE, content, 'utf-8');
}

export class PostgresOps implements DbmsAdapter {
  readonly sourceType = 'postgresql' as const;

  insertRecord(table: string, flatRecord: Record<string, unknown>): QueryResult {
    const cols = Object.keys(flatRecord);
    const vals = Object.values(flatRecord);
    const query = `INSERT INTO ${sqlId(table)} (${cols.map(sqlId).join(', ')})\nVALUES (${vals.map(sqlLit).join(', ')});`;
    appendToSeed(query);
    logQuery('postgresql', 'INSERT', table, query, 1);
    // Execute against live Docker PG (fire-and-forget)
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const liveSQL = `INSERT INTO ${sqlId(table)} (${cols.map(sqlId).join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
    pgQuery(liveSQL, vals).catch(() => {});
    return { query, executed: true, affected: 1 };
  }

  deleteRecord(table: string, flatId: string): QueryResult {
    const query = `DELETE FROM ${sqlId(table)} WHERE ${sqlId('id')} = ${sqlLit(flatId)};`;
    appendToSeed(query);
    logQuery('postgresql', 'DELETE', table, query, 1);
    pgQuery(`DELETE FROM ${sqlId(table)} WHERE id = $1`, [flatId]).catch(() => {});
    return { query, executed: true, affected: 1 };
  }

  updateField(table: string, flatId: string, fieldName: string, value: unknown): QueryResult {
    const query = [
      `UPDATE ${sqlId(table)}`,
      `SET ${sqlId(fieldName)} = ${sqlLit(value)},`,
      `    ${sqlId('updated_at')} = NOW(),`,
      `    ${sqlId('last_edited_by')} = 'app'`,
      `WHERE ${sqlId('id')} = ${sqlLit(flatId)};`,
    ].join('\n');
    appendToSeed(query);
    logQuery('postgresql', 'UPDATE', table, query, 1);
    pgQuery(
      `UPDATE ${sqlId(table)} SET ${sqlId(fieldName)} = $1, updated_at = NOW(), last_edited_by = 'app' WHERE id = $2`,
      [value, flatId],
    ).catch(() => {});
    return { query, executed: true, affected: 1 };
  }

  addColumn(table: string, columnName: string, propType = 'text'): QueryResult {
    const sqlType = PROP_TO_SQL[propType] ?? 'TEXT';
    const query = `ALTER TABLE ${sqlId(table)} ADD COLUMN ${sqlId(columnName)} ${sqlType};`;
    appendToSchema(query);
    logQuery('postgresql', 'ADD_COLUMN', table, query, 0);
    pgQuery(`ALTER TABLE ${sqlId(table)} ADD COLUMN IF NOT EXISTS ${sqlId(columnName)} ${sqlType}`).catch(() => {});
    return { query, executed: true, affected: 0 };
  }

  removeColumn(table: string, columnName: string): QueryResult {
    const query = `ALTER TABLE ${sqlId(table)} DROP COLUMN IF EXISTS ${sqlId(columnName)};`;
    appendToSchema(query);
    logQuery('postgresql', 'DROP_COLUMN', table, query, 0);
    pgQuery(`ALTER TABLE ${sqlId(table)} DROP COLUMN IF EXISTS ${sqlId(columnName)}`).catch(() => {});
    return { query, executed: true, affected: 0 };
  }

  changeColumnType(table: string, columnName: string, _old: string, newType: string): QueryResult {
    const sqlType = PROP_TO_SQL[newType] ?? 'TEXT';
    const pureType = sqlType.replace(/\s+DEFAULT\s+.*/i, '');
    const query = [
      `ALTER TABLE ${sqlId(table)}`,
      `ALTER COLUMN ${sqlId(columnName)} TYPE ${pureType}`,
      `USING ${sqlId(columnName)}::${pureType};`,
    ].join('\n');
    appendToSchema(query);
    logQuery('postgresql', 'ALTER_TYPE', table, query, 0);
    pgQuery(`ALTER TABLE ${sqlId(table)} ALTER COLUMN ${sqlId(columnName)} TYPE ${pureType} USING ${sqlId(columnName)}::${pureType}`).catch(() => {});
    return { query, executed: true, affected: 0 };
  }
}
