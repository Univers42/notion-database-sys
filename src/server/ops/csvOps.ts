// ─── CSV flat-file DBMS adapter ──────────────────────────────────────────────
// Reads/writes CSV entity files in src/store/dbms/csv/

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { markOwnWrite } from '../fileWatcher';
import type { DbmsAdapter, QueryResult } from './types';
import { parseCSVLine, csvEscape } from './helpers';
import { logQuery } from './queryLog';

const DIR = join(resolve(process.cwd()), 'src', 'store', 'dbms', 'csv');

function entityPath(table: string): string {
  return join(DIR, `${table}.csv`);
}

function readCsv(table: string): { headers: string[]; rows: string[][]; raw: string } {
  const p = entityPath(table);
  if (!existsSync(p)) return { headers: [], rows: [], raw: '' };
  const raw = readFileSync(p, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [], raw };
  const headers = parseCSVLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCSVLine(lines[i]));
  }
  return { headers, rows, raw };
}

function writeCsv(table: string, headers: string[], rows: string[][]): void {
  const p = entityPath(table);
  markOwnWrite(p);
  const headerLine = headers.map(csvEscape).join(',');
  const dataLines = rows.map(r => r.map(csvEscape).join(','));
  writeFileSync(p, [headerLine, ...dataLines].join('\n') + '\n', 'utf-8');
}

export class CsvOps implements DbmsAdapter {
  readonly sourceType = 'csv' as const;

  insertRecord(table: string, flatRecord: Record<string, unknown>): QueryResult {
    const { headers, rows } = readCsv(table);
    // If no file exists yet, create headers from the record keys
    const hdrs = headers.length > 0 ? headers : Object.keys(flatRecord);
    const row = hdrs.map(h => String(flatRecord[h] ?? ''));
    rows.push(row);
    writeCsv(table, hdrs, rows);
    // Show the template: as many commas as attributes
    const template = hdrs.join(',');
    const query = `-- ${table}.csv — append row\n-- template: ${template}\n${row.map(csvEscape).join(',')}`;
    logQuery('csv', 'INSERT', table, query, 1);
    return { query, executed: true, affected: 1 };
  }

  deleteRecord(table: string, flatId: string): QueryResult {
    const { headers, rows } = readCsv(table);
    const idCol = headers.indexOf('id');
    if (idCol === -1) {
      const q = `-- ${table}.csv — no "id" column found, cannot delete`;
      return { query: q, executed: false, affected: 0 };
    }
    const before = rows.length;
    const filtered = rows.filter(r => r[idCol] !== flatId);
    writeCsv(table, headers, filtered);
    const affected = before - filtered.length;
    const query = `-- ${table}.csv — delete row where id = "${flatId}"`;
    logQuery('csv', 'DELETE', table, query, affected);
    return { query, executed: true, affected };
  }

  updateField(table: string, flatId: string, fieldName: string, value: unknown): QueryResult {
    const { headers, rows } = readCsv(table);
    const idCol = headers.indexOf('id');
    const col = headers.indexOf(fieldName);
    if (idCol === -1 || col === -1) {
      const q = `-- ${table}.csv — column "${fieldName}" not found`;
      return { query: q, executed: false, affected: 0 };
    }
    let affected = 0;
    for (const row of rows) {
      if (row[idCol] === flatId) {
        row[col] = String(value ?? '');
        affected++;
        break;
      }
    }
    if (affected) writeCsv(table, headers, rows);
    const query = `-- ${table}.csv — SET ${fieldName} = ${JSON.stringify(value)} WHERE id = "${flatId}"`;
    logQuery('csv', 'UPDATE', table, query, affected);
    return { query, executed: true, affected };
  }

  addColumn(table: string, columnName: string): QueryResult {
    const { headers, rows } = readCsv(table);
    if (headers.includes(columnName)) {
      return { query: `-- ${table}.csv — column "${columnName}" already exists`, executed: false, affected: 0 };
    }
    headers.push(columnName);
    for (const row of rows) row.push('');
    writeCsv(table, headers, rows);
    const query = `-- ${table}.csv — ADD COLUMN "${columnName}" (position ${headers.length})`;
    logQuery('csv', 'ADD_COLUMN', table, query, rows.length);
    return { query, executed: true, affected: rows.length };
  }

  removeColumn(table: string, columnName: string): QueryResult {
    const { headers, rows } = readCsv(table);
    const col = headers.indexOf(columnName);
    if (col === -1) {
      return { query: `-- ${table}.csv — column "${columnName}" not found`, executed: false, affected: 0 };
    }
    headers.splice(col, 1);
    for (const row of rows) row.splice(col, 1);
    writeCsv(table, headers, rows);
    const query = `-- ${table}.csv — DROP COLUMN "${columnName}"`;
    logQuery('csv', 'DROP_COLUMN', table, query, rows.length);
    return { query, executed: true, affected: rows.length };
  }

  changeColumnType(table: string, columnName: string, _old: string, newType: string): QueryResult {
    // CSV columns are all strings — we just note the logical type change
    const query = `-- ${table}.csv — ALTER COLUMN "${columnName}" SET TYPE ${newType} (logical, CSV stores all as text)`;
    logQuery('csv', 'ALTER_TYPE', table, query, 0);
    return { query, executed: true, affected: 0 };
  }
}
