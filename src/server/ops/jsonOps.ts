/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   jsonOps.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:58:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { markOwnWrite } from '../fileWatcher';
import type { DbmsAdapter, QueryResult } from './types';
import { logQuery } from './queryLog';

const DIR = join(resolve(process.cwd()), 'src', 'store', 'dbms', 'json');

function entityPath(table: string): string {
  return join(DIR, `${table}.json`);
}

function readRecords(table: string): { raw: Record<string, unknown>; records: Record<string, unknown>[] } {
  const p = entityPath(table);
  if (!existsSync(p)) return { raw: { records: [] }, records: [] };
  const raw = JSON.parse(readFileSync(p, 'utf-8'));
  const records = raw.records ?? raw;
  return { raw, records: Array.isArray(records) ? records : [] };
}

function writeRecords(table: string, raw: Record<string, unknown>, records: Record<string, unknown>[]): void {
  const p = entityPath(table);
  markOwnWrite(p);
  if (raw.records) {
    raw.records = records;
    writeFileSync(p, JSON.stringify(raw, null, 2), 'utf-8');
  } else {
    writeFileSync(p, JSON.stringify(records, null, 2), 'utf-8');
  }
}

/** JSON flat-file DBMS adapter. Reads/writes entity JSON files. */
export class JsonOps implements DbmsAdapter {
  readonly sourceType = 'json' as const;

  insertRecord(table: string, flatRecord: Record<string, unknown>): QueryResult {
    const { raw, records } = readRecords(table);
    records.push(flatRecord);
    writeRecords(table, raw, records);
    const query = `// ${table}.json — append record\nrecords.push(${JSON.stringify(flatRecord, null, 2)})`;
    logQuery('json', 'INSERT', table, query, 1);
    return { query, executed: true, affected: 1 };
  }

  deleteRecord(table: string, flatId: string): QueryResult {
    const { raw, records } = readRecords(table);
    const before = records.length;
    const filtered = records.filter(r => String(r.id) !== flatId);
    writeRecords(table, raw, filtered);
    const affected = before - filtered.length;
    const query = `// ${table}.json — remove record\nrecords = records.filter(r => r.id !== "${flatId}")`;
    logQuery('json', 'DELETE', table, query, affected);
    return { query, executed: true, affected };
  }

  updateField(table: string, flatId: string, fieldName: string, value: unknown): QueryResult {
    const { raw, records } = readRecords(table);
    let affected = 0;
    for (const rec of records) {
      if (String(rec.id) === flatId) {
        rec[fieldName] = value;
        affected++;
        break;
      }
    }
    if (affected) writeRecords(table, raw, records);
    const valStr = JSON.stringify(value);
    const query = `// ${table}.json — update field\nrecord.${fieldName} = ${valStr}  // where id = "${flatId}"`;
    logQuery('json', 'UPDATE', table, query, affected);
    return { query, executed: true, affected };
  }

  addColumn(table: string, columnName: string): QueryResult {
    const { raw, records } = readRecords(table);
    for (const rec of records) {
      if (!(columnName in rec)) rec[columnName] = null;
    }
    writeRecords(table, raw, records);
    const query = `// ${table}.json — add field "${columnName}" to all ${records.length} records`;
    logQuery('json', 'ADD_COLUMN', table, query, records.length);
    return { query, executed: true, affected: records.length };
  }

  removeColumn(table: string, columnName: string): QueryResult {
    const { raw, records } = readRecords(table);
    for (const rec of records) {
      delete rec[columnName];
    }
    writeRecords(table, raw, records);
    const query = `// ${table}.json — remove field "${columnName}" from all ${records.length} records`;
    logQuery('json', 'DROP_COLUMN', table, query, records.length);
    return { query, executed: true, affected: records.length };
  }

  changeColumnType(table: string, columnName: string, _oldType: string, newType: string): QueryResult {
    const { raw, records } = readRecords(table);
    for (const rec of records) {
      if (columnName in rec) {
        rec[columnName] = coerceValue(rec[columnName], newType);
      }
    }
    writeRecords(table, raw, records);
    const query = `// ${table}.json — cast "${columnName}" to ${newType} for ${records.length} records`;
    logQuery('json', 'ALTER_TYPE', table, query, records.length);
    return { query, executed: true, affected: records.length };
  }
}

function coerceValue(val: unknown, toType: string): unknown {
  if (val === null || val === undefined) return null;
  switch (toType) {
    case 'number': return Number(val) || 0;
    case 'text': case 'title': return String(val);
    case 'checkbox': return Boolean(val);
    case 'select': return String(val);
    case 'multi_select': return Array.isArray(val) ? val : [String(val)];
    case 'date': return String(val);
    default: return val;
  }
}
