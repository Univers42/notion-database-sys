// ─── PostgreSQL query generator ──────────────────────────────────────────────
// Pure query generation + logging.  No file writes, no live DB execution.
// The _notion_state.json file is the single source of truth for the app.
// Seed files (002_seed.sql, 001_schema.sql) are only modified by `make seed-*`.

import type { DbmsAdapter, QueryResult } from './types';
import { PROP_TO_SQL } from './types';
import { sqlId, sqlLit } from './helpers';
import { logQuery } from './queryLog';

export class PostgresOps implements DbmsAdapter {
  readonly sourceType = 'postgresql' as const;

  insertRecord(table: string, flatRecord: Record<string, unknown>): QueryResult {
    const cols = Object.keys(flatRecord);
    const vals = Object.values(flatRecord);
    const query = `INSERT INTO ${sqlId(table)} (${cols.map(sqlId).join(', ')})\nVALUES (${vals.map(sqlLit).join(', ')});`;
    logQuery('postgresql', 'INSERT', table, query, 1);
    return { query, executed: false, affected: 1 };
  }

  deleteRecord(table: string, flatId: string): QueryResult {
    const query = `DELETE FROM ${sqlId(table)} WHERE ${sqlId('id')} = ${sqlLit(flatId)};`;
    logQuery('postgresql', 'DELETE', table, query, 1);
    return { query, executed: false, affected: 1 };
  }

  updateField(table: string, flatId: string, fieldName: string, value: unknown): QueryResult {
    const query = [
      `UPDATE ${sqlId(table)}`,
      `SET ${sqlId(fieldName)} = ${sqlLit(value)},`,
      `    ${sqlId('updated_at')} = NOW(),`,
      `    ${sqlId('last_edited_by')} = 'app'`,
      `WHERE ${sqlId('id')} = ${sqlLit(flatId)};`,
    ].join('\n');
    logQuery('postgresql', 'UPDATE', table, query, 1);
    return { query, executed: false, affected: 1 };
  }

  addColumn(table: string, columnName: string, propType = 'text'): QueryResult {
    const sqlType = PROP_TO_SQL[propType] ?? 'TEXT';
    const query = `ALTER TABLE ${sqlId(table)} ADD COLUMN ${sqlId(columnName)} ${sqlType};`;
    logQuery('postgresql', 'ADD_COLUMN', table, query, 0);
    return { query, executed: false, affected: 0 };
  }

  removeColumn(table: string, columnName: string): QueryResult {
    const query = `ALTER TABLE ${sqlId(table)} DROP COLUMN IF EXISTS ${sqlId(columnName)};`;
    logQuery('postgresql', 'DROP_COLUMN', table, query, 0);
    return { query, executed: false, affected: 0 };
  }

  changeColumnType(table: string, columnName: string, _old: string, newType: string): QueryResult {
    const sqlType = PROP_TO_SQL[newType] ?? 'TEXT';
    const pureType = sqlType.replace(/\s+DEFAULT\s+.*/i, '');
    const query = [
      `ALTER TABLE ${sqlId(table)}`,
      `ALTER COLUMN ${sqlId(columnName)} TYPE ${pureType}`,
      `USING ${sqlId(columnName)}::${pureType};`,
    ].join('\n');
    logQuery('postgresql', 'ALTER_TYPE', table, query, 0);
    return { query, executed: false, affected: 0 };
  }
}
