/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 22:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// DBMS operation dispatchers — route CRUD / DDL operations to the active source
// Each dispatcher builds the appropriate query (SQL, Mongo shell, etc.) and
// appends it to the in-memory query log so the playground can inspect what
// the middleware did under the hood.

export { sqlLit, mongoLit } from './helpers';

type DbSource = 'json' | 'csv' | 'mongodb' | 'postgresql';
type FieldMap = Record<string, string>;
type DispatchResult = { query: string } | null;

const queryLog: { ts: number; query: string }[] = [];

function log(query: string): DispatchResult {
  queryLog.push({ ts: Date.now(), query });
  return { query };
}

/** Insert a flat record into the backing store. */
export function dispatchInsert(
  source: DbSource, _dbId: string,
  record: Record<string, unknown>, _fieldMap: FieldMap,
): DispatchResult {
  if (source === 'json' || source === 'csv') return null;
  const cols = Object.keys(record).join(', ');
  const vals = Object.values(record).map(v => JSON.stringify(v)).join(', ');
  return log(`INSERT INTO ... (${cols}) VALUES (${vals})`);
}

/** Delete a record by its flat ID. */
export function dispatchDelete(
  source: DbSource, _dbId: string,
  flatId: string, _fieldMap: FieldMap,
): DispatchResult {
  if (source === 'json' || source === 'csv') return null;
  return log(`DELETE FROM ... WHERE id = '${flatId}'`);
}

/** Update a single field on a record. */
export function dispatchUpdate(
  source: DbSource, _dbId: string,
  flatId: string, fieldName: string,
  value: unknown, _fieldMap: FieldMap,
): DispatchResult {
  if (source === 'json' || source === 'csv') return null;
  return log(`UPDATE ... SET ${fieldName} = ${JSON.stringify(value)} WHERE id = '${flatId}'`);
}

/** Add a column (DDL). */
export function dispatchAddColumn(
  source: DbSource, _dbId: string,
  columnName: string, propType: string,
): DispatchResult {
  if (source === 'json' || source === 'csv') return null;
  return log(`ALTER TABLE ... ADD COLUMN ${columnName} ${propType}`);
}

/** Drop a column (DDL). */
export function dispatchDropColumn(
  source: DbSource, _dbId: string,
  columnName: string,
): DispatchResult {
  if (source === 'json' || source === 'csv') return null;
  return log(`ALTER TABLE ... DROP COLUMN ${columnName}`);
}

/** Change a column type (DDL). */
export function dispatchChangeType(
  source: DbSource, _dbId: string,
  columnName: string, _oldType: string, newType: string,
): DispatchResult {
  if (source === 'json' || source === 'csv') return null;
  return log(`ALTER TABLE ... ALTER COLUMN ${columnName} TYPE ${newType}`);
}

/** Get the last N query log entries. */
export function getQueryLog(limit = 50): { ts: number; query: string }[] {
  return queryLog.slice(-limit);
}

/** Clear the query log. */
export function clearQueryLog(): void {
  queryLog.length = 0;
}
