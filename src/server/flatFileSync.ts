/** @file flatFileSync.ts — JSON / CSV flat-file sync helpers. */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { safeString } from '../utils/safeString';
import type { PageLike } from './dbmsTypes';
import { SOURCE_DIR } from './dbmsTypes';
import { markOwnWrite } from './fileWatcher';
import { atomicWriteSync } from './atomicWrite';

/** Resolve possible flat-file IDs for this page.
 *  Returns candidates: auto-increment property value (if mapped) + page ID. */
export function resolveFlatIds(page: PageLike, fieldMap: Record<string, string>): string[] {
  const ids: string[] = [];
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id' && propId in page.properties) {
      ids.push(safeString(page.properties[propId]));
    }
  }
  // Always include raw page ID as fallback
  if (!ids.includes(page.id)) ids.push(page.id);
  return ids;
}

/** Resolve the single best flat-file ID for a page (auto-increment first). */
export function resolveFlatId(page: PageLike, fieldMap: Record<string, string>): string {
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id' && propId in page.properties) {
      return safeString(page.properties[propId]);
    }
  }
  return page.id;
}

/** Update flat record fields from page properties (skip 'id'). */
export function updateFlatRecord(
  record: Record<string, unknown>, page: PageLike, fieldMap: Record<string, string>,
): void {
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id') continue;
    if (propId in page.properties) {
      record[fieldName] = page.properties[propId];
    }
  }
}

export function getEntityFiles(dir: string, ext: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f: string) => f.endsWith(ext) && !f.startsWith('_'))
      .map((f: string) => join(dir, f));
  } catch {
    return [];
  }
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes && ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (inQuotes && ch === '"') {
      inQuotes = false;
    } else if (inQuotes) {
      current += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replaceAll('"', '""')}"`;
  }
  return val;
}

/** Sync a page change to its flat JSON entity file. */
export function syncJsonEntity(source: string, page: PageLike, fieldMap: Record<string, string>): void {
  if (source !== 'json') return;
  const flatIds = resolveFlatIds(page, fieldMap);

  const entityFiles = getEntityFiles(SOURCE_DIR.json, '.json');
  for (const filePath of entityFiles) {
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
      const records: Record<string, unknown>[] = raw.records ?? raw;
      const idx = records.findIndex((r) => flatIds.includes(safeString(r.id)));
      if (idx === -1) continue;
      updateFlatRecord(records[idx], page, fieldMap);
      markOwnWrite(filePath);
      const output = raw.records ? { ...raw, records } : records;
      atomicWriteSync(filePath, JSON.stringify(output, null, 2));
      return;
    } catch {
      // skip files that don't parse
    }
  }
}

/** Update CSV cells from page properties (skip 'id'). */
function updateCsvCells(
  cells: string[], headers: string[], page: PageLike, fieldMap: Record<string, string>,
): void {
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id') continue;
    const col = headers.indexOf(fieldName);
    if (col !== -1 && propId in page.properties) {
      cells[col] = safeString(page.properties[propId] ?? '');
    }
  }
}

/** Find and update the matching CSV row. Returns true if found. */
function findAndUpdateCsvRow(
  lines: string[], headers: string[], idCol: number,
  flatIds: string[], page: PageLike, fieldMap: Record<string, string>,
): boolean {
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseCSVLine(lines[i]);
    if (!flatIds.includes(cells[idCol])) continue;
    updateCsvCells(cells, headers, page, fieldMap);
    lines[i] = cells.map(csvEscape).join(',');
    return true;
  }
  return false;
}

/** Sync a page change to its flat CSV entity file. */
export function syncCsvEntity(source: string, page: PageLike, fieldMap: Record<string, string>): void {
  if (source !== 'csv') return;
  const flatIds = resolveFlatIds(page, fieldMap);

  const entityFiles = getEntityFiles(SOURCE_DIR.csv, '.csv');
  for (const filePath of entityFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      if (lines.length < 2) continue;
      const headers = parseCSVLine(lines[0]);
      const idCol = headers.indexOf('id');
      if (idCol === -1) continue;

      if (findAndUpdateCsvRow(lines, headers, idCol, flatIds, page, fieldMap)) {
        markOwnWrite(filePath);
        atomicWriteSync(filePath, lines.join('\n'));
        return;
      }
    } catch {
      // skip
    }
  }
}
