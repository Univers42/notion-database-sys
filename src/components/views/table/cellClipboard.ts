// ─── cellClipboard — spreadsheet copy/paste for table cells ──────────────────
// Copy writes what the cell shows (option labels, related titles, local dates),
// so pasting into a spreadsheet or another column reads as text. Paste parses
// text back per column type; text a column cannot hold is skipped, never
// coerced into a value the user did not type.
// Caveat: select / multi-select paste matches existing options by label or id —
// an unknown label is skipped instead of creating an option (Notion creates
// it). Relation, person and file cells are copy-only. An unterminated quote in
// pasted text swallows the rest of the clipboard into one cell (Sheets does too).

import type { Page, SchemaProperty } from '../../../types/database';
import { semanticValue, type CellValueSource } from '../../../store/slices/cellValues';
import { clearValueFor } from './gridKeyboard';

const pad = (n: number) => String(n).padStart(2, '0');

function dateText(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return d.getHours() || d.getMinutes() ? `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}` : day;
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return dateText(value);
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    const named = value as { name?: unknown; url?: unknown };
    return typeof named.name === 'string' ? named.name : typeof named.url === 'string' ? named.url : '';
  }
  return String(value);
}

/** The text a copied cell puts on the clipboard. */
export function cellCopyText(source: CellValueSource, page: Page, prop: SchemaProperty): string {
  return valueText(semanticValue(source, page, prop));
}

function optionId(prop: SchemaProperty, label: string): string | undefined {
  const lower = label.toLowerCase();
  return prop.options?.find(o => o.id === label || o.value.toLowerCase() === lower)?.id;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

function parseDate(text: string): string | undefined {
  const day = ISO_DAY.exec(text);
  const date = day
    ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), Number(day[4] ?? 0), Number(day[5] ?? 0))
    : ISO_INSTANT.test(text) ? new Date(text) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
}

const PASTABLE_TYPES = new Set(['title', 'text', 'email', 'url', 'phone', 'number', 'checkbox',
  'select', 'status', 'multi_select', 'date', 'due_date']);

/** The stored value pasted text becomes in `prop`, or undefined when the
 *  column cannot hold it (computed, read-only, or unparseable text). */
export function parsePastedValue(text: string, prop: SchemaProperty): unknown {
  const trimmed = text.trim();
  if (!trimmed && PASTABLE_TYPES.has(prop.type)) return clearValueFor(prop.type);
  switch (prop.type) {
    case 'title':
    case 'text':
      return text;
    case 'email':
    case 'url':
    case 'phone':
      return trimmed;
    case 'number': {
      const n = Number(trimmed.replace(/[\s_]/g, ''));
      return Number.isFinite(n) ? n : undefined;
    }
    case 'checkbox':
      if (/^(yes|true|1|x|✓|✔|checked|on)$/i.test(trimmed)) return true;
      return /^(no|false|0|unchecked|off)$/i.test(trimmed) ? false : undefined;
    case 'select':
    case 'status':
      return optionId(prop, trimmed);
    case 'multi_select': {
      const ids = trimmed.split(/[,;\n]/).map(s => s.trim()).filter(Boolean)
        .map(label => optionId(prop, label)).filter((id): id is string => id !== undefined);
      return ids.length ? [...new Set(ids)] : undefined;
    }
    case 'date':
    case 'due_date':
      return parseDate(trimmed);
    default:
      return undefined;
  }
}

/** Clipboard text as rows × cells: tab-separated, one row per line, with the
 *  Excel / Sheets quoting ("a""b") for cells that hold tabs or newlines. */
export function parseClipboardGrid(text: string): string[][] {
  const s = text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  let row: string[] = [];
  const rows = [row];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (s[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); cell = ''; row = []; rows.push(row); }
    else cell += c;
  }
  row.push(cell);
  return rows;
}

export interface CellWrite { pageId: string; propId: string; value: unknown }

/** The writes a pasted grid makes from the anchor cell, clipped to the rows
 *  and columns on screen. Rows are never created. */
export function planPaste(
  grid: readonly string[][],
  rows: readonly Page[],
  props: readonly SchemaProperty[],
  anchor: { pageId: string; propId: string },
): CellWrite[] {
  const r0 = rows.findIndex(p => p.id === anchor.pageId);
  const c0 = props.findIndex(p => p.id === anchor.propId);
  if (r0 < 0 || c0 < 0) return [];
  const writes: CellWrite[] = [];
  for (let r = 0; r < grid.length && r0 + r < rows.length; r++) {
    for (let c = 0; c < grid[r].length && c0 + c < props.length; c++) {
      const prop = props[c0 + c];
      const value = parsePastedValue(grid[r][c], prop);
      if (value !== undefined) writes.push({ pageId: rows[r0 + r].id, propId: prop.id, value });
    }
  }
  return writes;
}
