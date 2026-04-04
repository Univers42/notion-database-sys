/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   fileWatcher.sync.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { readFileSync } from 'node:fs';
import { safeString } from '../utils/safeString';
import type { Changeset, NotionState, PageLike } from './fileWatcher.types';

function parseCSVLine(line: string): string[] {
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

/** Inverts a field map: { propId → fieldName } → { fieldName → propId } */
function invertMap(fmap: Record<string, string>): Record<string, string> {
  const inv: Record<string, string> = {};
  for (const [propId, fieldName] of Object.entries(fmap)) {
    // First match wins (some props may map to the same field for formulas)
    if (!(fieldName in inv)) inv[fieldName] = propId;
  }
  return inv;
}

/** Find a page matching a flat record ID within a specific database. */
function findPageByFlatId(
  state: NotionState, dbId: string, flatId: string,
  fieldMap: Record<string, string>,
): PageLike | undefined {
  return Object.values(state.pages).find((p) => {
    if (p.databaseId !== dbId) return false;
    if (p.id === flatId) return true;
    for (const [propId, fname] of Object.entries(fieldMap)) {
      if (fname === 'id' && safeString(p.properties[propId]) === flatId) return true;
    }
    return false;
  });
}

/** Apply property changes from a flat record to a page, collecting patch diffs. */
function applyFlatChanges(
  page: PageLike, flatFields: [string, unknown][],
  inv: Record<string, string>, patches: Changeset,
): void {
  for (const [flatField, flatValue] of flatFields) {
    if (flatField === 'id') continue;
    const propId = inv[flatField];
    if (!propId) continue;
    if (page.properties[propId] !== flatValue) {
      page.properties[propId] = flatValue;
      (page as Record<string, unknown>).updatedAt = new Date().toISOString();
      (page as Record<string, unknown>).lastEditedBy = 'External';
      if (!patches[page.id]) patches[page.id] = {};
      patches[page.id][propId] = flatValue;
    }
  }
}

/** Read flat JSON records and merge back into the state pages. */
export function syncJsonToState(
  filePath: string, dbId: string, state: NotionState,
  fieldMap: Record<string, string>,
): Changeset {
  const inv = invertMap(fieldMap);
  const patches: Changeset = {};
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(filePath, 'utf-8')); } catch { return patches; }
  const records: Record<string, unknown>[] =
    (raw && typeof raw === 'object' && 'records' in (raw as Record<string, unknown>))
      ? ((raw as Record<string, unknown>).records as Record<string, unknown>[])
      : (raw as Record<string, unknown>[]);
  if (!Array.isArray(records)) return patches;

  for (const rec of records) {
    const flatId = safeString(rec.id ?? '');
    const page = findPageByFlatId(state, dbId, flatId, fieldMap);
    if (!page) continue;
    applyFlatChanges(page, Object.entries(rec), inv, patches);
  }
  return patches;
}

/** Coerce a CSV cell value to match the current property type. */
function coerceCsvValue(flatValue: string, currentVal: unknown): unknown {
  if (typeof currentVal === 'number') return flatValue === '' ? null : Number(flatValue);
  if (typeof currentVal === 'boolean') return flatValue === 'true';
  return flatValue;
}

/** Read flat CSV records and merge back into the state pages. */
export function syncCsvToState(
  filePath: string, dbId: string, state: NotionState,
  fieldMap: Record<string, string>,
): Changeset {
  const inv = invertMap(fieldMap);
  const patches: Changeset = {};
  let content: string;
  try { content = readFileSync(filePath, 'utf-8'); } catch { return patches; }
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return patches;

  const headers = parseCSVLine(lines[0]);
  const idCol = headers.indexOf('id');
  if (idCol === -1) return patches;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const flatId = cells[idCol];
    if (!flatId) continue;

    const page = findPageByFlatId(state, dbId, flatId, fieldMap);
    if (!page) continue;

    const flatFields: [string, unknown][] = headers
      .map((h, c) => [h, coerceCsvValue(cells[c] ?? '', page.properties[inv[h]])] as [string, unknown])
      .filter(([h]) => h !== headers[idCol]);
    applyFlatChanges(page, flatFields, inv, patches);
  }
  return patches;
}
