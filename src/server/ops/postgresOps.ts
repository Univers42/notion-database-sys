/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   postgresOps.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:58:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { DbmsAdapter, QueryResult } from './types';
import { PROP_TO_SQL } from './types';
import { sqlId, sqlLit } from './helpers';
import { logQuery } from './queryLog';
import { pgQuery } from '../db/pgPool';

/** PostgreSQL DBMS adapter. Generates and executes SQL queries. */
export class PostgresOps implements DbmsAdapter {
  readonly sourceType = 'postgresql' as const;

  insertRecord(table: string, flatRecord: Record<string, unknown>): QueryResult {
    const cols = Object.keys(flatRecord);
    const vals = Object.values(flatRecord);
    const query = `INSERT INTO ${sqlId(table)} (${cols.map(sqlId).join(', ')})\nVALUES (${vals.map(sqlLit).join(', ')});`;
    logQuery('postgresql', 'INSERT', table, query, 1);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const liveSQL = `INSERT INTO ${sqlId(table)} (${cols.map(sqlId).join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
    pgQuery(liveSQL, vals).catch((e) => console.error('[pg] INSERT error:', e));
    return { query, executed: true, affected: 1 };
  }

  deleteRecord(table: string, flatId: string): QueryResult {
    const query = `DELETE FROM ${sqlId(table)} WHERE ${sqlId('id')} = ${sqlLit(flatId)};`;
    logQuery('postgresql', 'DELETE', table, query, 1);
    pgQuery(`DELETE FROM ${sqlId(table)} WHERE id = $1`, [flatId]).catch((e) => console.error('[pg] DELETE error:', e));
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
    logQuery('postgresql', 'UPDATE', table, query, 1);
    pgQuery(
      `UPDATE ${sqlId(table)} SET ${sqlId(fieldName)} = $1, updated_at = NOW(), last_edited_by = 'app' WHERE id = $2`,
      [value, flatId],
    ).catch((e) => console.error('[pg] UPDATE error:', e));
    return { query, executed: true, affected: 1 };
  }

  addColumn(table: string, columnName: string, propType = 'text'): QueryResult {
    const sqlType = PROP_TO_SQL[propType] ?? 'TEXT';
    const query = `ALTER TABLE ${sqlId(table)} ADD COLUMN ${sqlId(columnName)} ${sqlType};`;
    logQuery('postgresql', 'ADD_COLUMN', table, query, 0);
    pgQuery(`ALTER TABLE ${sqlId(table)} ADD COLUMN IF NOT EXISTS ${sqlId(columnName)} ${sqlType}`).catch((e) => console.error('[pg] ADD_COLUMN error:', e));
    return { query, executed: true, affected: 0 };
  }

  removeColumn(table: string, columnName: string): QueryResult {
    const query = `ALTER TABLE ${sqlId(table)} DROP COLUMN IF EXISTS ${sqlId(columnName)};`;
    logQuery('postgresql', 'DROP_COLUMN', table, query, 0);
    pgQuery(`ALTER TABLE ${sqlId(table)} DROP COLUMN IF EXISTS ${sqlId(columnName)}`).catch((e) => console.error('[pg] DROP_COLUMN error:', e));
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
    logQuery('postgresql', 'ALTER_TYPE', table, query, 0);
    pgQuery(`ALTER TABLE ${sqlId(table)} ALTER COLUMN ${sqlId(columnName)} TYPE ${pureType} USING ${sqlId(columnName)}::${pureType}`).catch((e) => console.error('[pg] ALTER_TYPE error:', e));
    return { query, executed: true, affected: 0 };
  }
}
