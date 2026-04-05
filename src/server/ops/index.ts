/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 22:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 23:11:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// DBMS operation dispatchers — route CRUD / DDL operations to the active source.
// For postgresql / mongodb sources, operations are executed against the live
// database AND appended to the in-memory query log for UI inspection.

import { sqlId, sqlLit, mongoLit } from './helpers';
import { getPgPool, getMongoDb, resolveTableName, propTypeToSql } from '../db/connections';

export { sqlLit, mongoLit };

type DbSource = 'json' | 'csv' | 'mongodb' | 'postgresql';
type FieldMap = Record<string, string>;
export type DispatchResult = { query: string } | null;

const queryLog: { ts: number; query: string }[] = [];

function log(query: string): DispatchResult {
  queryLog.push({ ts: Date.now(), query });
  return { query };
}

// ── INSERT ───────────────────────────────────────────────────────────────────

/** Insert a flat record into the backing store. */
export async function dispatchInsert(
  source: DbSource, dbId: string,
  record: Record<string, unknown>, _fieldMap: FieldMap,
): Promise<DispatchResult> {
  if (source === 'json' || source === 'csv') return null;
  const table = resolveTableName(dbId);
  if (!table) return null;

  if (source === 'postgresql') {
    // Filter null values so PG column defaults (e.g. DEFAULT NOW()) apply
    const entries = Object.entries(record).filter(([, v]) => v != null);
    const cols = entries.map(([k]) => k);
    const vals = entries.map(([, v]) => v);
    const placeholders = vals.map((_, i) => `$${i + 1}`);
    const realQuery = `INSERT INTO ${sqlId(table)} (${cols.map(sqlId).join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (${sqlId('id')}) DO NOTHING`;
    try {
      await getPgPool().query(realQuery, vals);
    } catch (err) {
      console.error('[ops] PG INSERT failed:', err);
    }
    return log(`INSERT INTO ${sqlId(table)} (${cols.join(', ')}) VALUES (${vals.map(v => sqlLit(v)).join(', ')})`);
  }

  if (source === 'mongodb') {
    const doc: Record<string, unknown> = { _id: record.id };
    for (const [k, v] of Object.entries(record)) {
      if (k !== 'id' && v != null) doc[k] = v;
    }
    try {
      const db = await getMongoDb();
      await db.collection(table).insertOne(doc as never);
    } catch (err) {
      console.error('[ops] Mongo insertOne failed:', err);
    }
    return log(`db.${table}.insertOne(${JSON.stringify(doc)})`);
  }

  return null;
}

// ── DELETE ───────────────────────────────────────────────────────────────────

/** Delete a record by its flat ID. */
export async function dispatchDelete(
  source: DbSource, dbId: string,
  flatId: string, _fieldMap: FieldMap,
): Promise<DispatchResult> {
  if (source === 'json' || source === 'csv') return null;
  const table = resolveTableName(dbId);
  if (!table) return null;

  if (source === 'postgresql') {
    try {
      await getPgPool().query(
        `DELETE FROM ${sqlId(table)} WHERE ${sqlId('id')} = $1`, [flatId],
      );
    } catch (err) {
      console.error('[ops] PG DELETE failed:', err);
    }
    return log(`DELETE FROM ${sqlId(table)} WHERE id = ${sqlLit(flatId)}`);
  }

  if (source === 'mongodb') {
    try {
      const db = await getMongoDb();
      await db.collection(table).deleteOne({ _id: flatId as never });
    } catch (err) {
      console.error('[ops] Mongo deleteOne failed:', err);
    }
    return log(`db.${table}.deleteOne({ _id: ${mongoLit(flatId)} })`);
  }

  return null;
}

// ── UPDATE ───────────────────────────────────────────────────────────────────

/** Update a single field on a record. */
export async function dispatchUpdate(
  source: DbSource, dbId: string,
  flatId: string, fieldName: string,
  value: unknown, _fieldMap: FieldMap,
): Promise<DispatchResult> {
  if (source === 'json' || source === 'csv') return null;
  const table = resolveTableName(dbId);
  if (!table) return null;

  if (source === 'postgresql') {
    const realQuery = `UPDATE ${sqlId(table)} SET ${sqlId(fieldName)} = $1, ${sqlId('updated_at')} = NOW(), ${sqlId('last_edited_by')} = $2 WHERE ${sqlId('id')} = $3`;
    try {
      await getPgPool().query(realQuery, [value, 'You', flatId]);
    } catch (err) {
      console.error('[ops] PG UPDATE failed:', err);
    }
    return log(`UPDATE ${sqlId(table)} SET ${sqlId(fieldName)} = ${sqlLit(value)} WHERE id = ${sqlLit(flatId)}`);
  }

  if (source === 'mongodb') {
    try {
      const db = await getMongoDb();
      await db.collection(table).updateOne(
        { _id: flatId as never },
        { $set: { [fieldName]: value, updated_at: new Date().toISOString(), last_edited_by: 'You' } },
      );
    } catch (err) {
      console.error('[ops] Mongo updateOne failed:', err);
    }
    return log(`db.${table}.updateOne({ _id: ${mongoLit(flatId)} }, { $set: { ${fieldName}: ${mongoLit(value)} } })`);
  }

  return null;
}

// ── ADD COLUMN (DDL) ─────────────────────────────────────────────────────────

/** Add a column (DDL). */
export async function dispatchAddColumn(
  source: DbSource, dbId: string,
  columnName: string, propType: string,
): Promise<DispatchResult> {
  if (source === 'json' || source === 'csv') return null;
  const table = resolveTableName(dbId);
  if (!table) return null;

  if (source === 'postgresql') {
    const sqlType = propTypeToSql(propType);
    const ddl = `ALTER TABLE ${sqlId(table)} ADD COLUMN IF NOT EXISTS ${sqlId(columnName)} ${sqlType}`;
    try {
      await getPgPool().query(ddl);
    } catch (err) {
      console.error('[ops] PG ADD COLUMN failed:', err);
    }
    return log(ddl);
  }

  // MongoDB is schema-less — log for transparency
  return log(`db.${table} — add field "${columnName}" (schema-less, no DDL needed)`);
}

// ── DROP COLUMN (DDL) ────────────────────────────────────────────────────────

/** Drop a column (DDL). */
export async function dispatchDropColumn(
  source: DbSource, dbId: string,
  columnName: string,
): Promise<DispatchResult> {
  if (source === 'json' || source === 'csv') return null;
  const table = resolveTableName(dbId);
  if (!table) return null;

  if (source === 'postgresql') {
    const ddl = `ALTER TABLE ${sqlId(table)} DROP COLUMN IF EXISTS ${sqlId(columnName)}`;
    try {
      await getPgPool().query(ddl);
    } catch (err) {
      console.error('[ops] PG DROP COLUMN failed:', err);
    }
    return log(ddl);
  }

  if (source === 'mongodb') {
    try {
      const db = await getMongoDb();
      await db.collection(table).updateMany({}, { $unset: { [columnName]: '' } });
    } catch (err) {
      console.error('[ops] Mongo $unset failed:', err);
    }
    return log(`db.${table}.updateMany({}, { $unset: { "${columnName}": "" } })`);
  }

  return null;
}

// ── CHANGE TYPE (DDL) ────────────────────────────────────────────────────────

/** Change a column type (DDL). */
export async function dispatchChangeType(
  source: DbSource, dbId: string,
  columnName: string, _oldType: string, newType: string,
): Promise<DispatchResult> {
  if (source === 'json' || source === 'csv') return null;
  const table = resolveTableName(dbId);
  if (!table) return null;

  if (source === 'postgresql') {
    const sqlType = propTypeToSql(newType);
    const ddl = `ALTER TABLE ${sqlId(table)} ALTER COLUMN ${sqlId(columnName)} TYPE ${sqlType} USING ${sqlId(columnName)}::${sqlType}`;
    try {
      await getPgPool().query(ddl);
    } catch (err) {
      console.error('[ops] PG CHANGE TYPE failed:', err);
    }
    return log(ddl);
  }

  // MongoDB is schema-less
  return log(`db.${table} — change "${columnName}" type to ${newType} (schema-less)`);
}

// ── Query log ────────────────────────────────────────────────────────────────

/** Get the last N query log entries. */
export function getQueryLog(limit = 50): { ts: number; query: string }[] {
  return queryLog.slice(-limit);
}

/** Clear the query log. */
export function clearQueryLog(): void {
  queryLog.length = 0;
}
