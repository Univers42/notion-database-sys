/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   gridClipboard.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 08:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 08:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Pure copy / cut / paste for a cell range of the table grid. The clipboard
 * format is tab-separated text, the one spreadsheets read and write, so a range
 * round-trips through Excel or Google Sheets as well as within the grid.
 * Values travel as the labels a person sees ("Alpha, Beta", "Yes", a formula's
 * result) and are coerced back per column type on paste.
 *
 * Caveat: relation, person, files, place, computed and custom cells copy as text
 * but never paste from text (an id cannot be recovered from a title), so those
 * cells are left unchanged. A paste is clipped to the existing rows; it never
 * adds rows.
 */

import type { Page, SchemaProperty } from '../../../types/database';
import { semanticValue, type CellValueSource } from '../../../store/slices/cellValues';
import { clearValueFor, isClearableType, type CellRange } from './gridKeyboard';

export interface CellWrite {
  pageId: string;
  propId: string;
  value: unknown;
}

const NEEDS_QUOTES = /[\t\n\r"]/;

function quoteCell(cell: string): string {
  return NEEDS_QUOTES.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

/** Rows end in a newline when there are several, as Excel writes them, so a
 *  trailing empty row survives the round trip through parseTsv. */
export function toTsv(rows: string[][]): string {
  const body = rows.map(row => row.map(quoteCell).join('\t')).join('\n');
  return rows.length > 1 ? `${body}\n` : body;
}

/** Parses spreadsheet clipboard text: quoted cells may hold tabs, newlines and
 *  doubled quotes; one trailing line terminator is dropped. */
export function parseTsv(text: string): string[][] {
  const source = text.replaceAll('\r\n', '\n').replace(/\n$/, '');
  const rows: string[][] = [[]];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === '\t') { rows[rows.length - 1].push(cell); cell = ''; }
    else if (ch === '\n') { rows[rows.length - 1].push(cell); rows.push([]); cell = ''; }
    else cell += ch;
  }
  rows[rows.length - 1].push(cell);
  return rows;
}

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

/** The text a copied cell puts on the clipboard: what the cell shows, computed
 *  values (formula, rollup, related titles) included. */
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

/** The stored value pasted text becomes in `prop`, or undefined to leave the
 *  cell unchanged (computed, read-only, or unparseable text). */
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

/** The range as spreadsheet text. */
export function copyRange(range: CellRange, pages: readonly Page[], props: readonly SchemaProperty[], source: CellValueSource): string {
  const rows: string[][] = [];
  for (let r = range.rowStart; r <= range.rowEnd; r++) {
    const page = pages[r];
    if (!page) continue;
    const row: string[] = [];
    for (let c = range.colStart; c <= range.colEnd; c++) {
      const prop = props[c];
      if (prop) row.push(cellCopyText(source, page, prop));
    }
    rows.push(row);
  }
  return toTsv(rows);
}

/** The writes a paste makes. One copied value fills every selected cell;
 *  a larger block lands from the range's top-left cell, clipped to the grid. */
export function planPaste(clipboard: readonly string[][], range: CellRange, pages: readonly Page[], props: readonly SchemaProperty[]): CellWrite[] {
  const single = clipboard.length === 1 && clipboard[0].length === 1;
  const rowEnd = single ? range.rowEnd : Math.min(pages.length - 1, range.rowStart + clipboard.length - 1);
  const writes: CellWrite[] = [];
  for (let r = range.rowStart; r <= rowEnd; r++) {
    const source = single ? clipboard[0] : clipboard[r - range.rowStart];
    const colEnd = single ? range.colEnd : Math.min(props.length - 1, range.colStart + source.length - 1);
    for (let c = range.colStart; c <= colEnd; c++) {
      const prop = props[c];
      const page = pages[r];
      if (!prop || !page) continue;
      const value = parsePastedValue(single ? source[0] : source[c - range.colStart], prop);
      if (value !== undefined) writes.push({ pageId: page.id, propId: prop.id, value });
    }
  }
  return writes;
}

/** The writes that empty every writable cell of the range (Delete, cut). */
export function planClear(range: CellRange, pages: readonly Page[], props: readonly SchemaProperty[]): CellWrite[] {
  const writes: CellWrite[] = [];
  for (let r = range.rowStart; r <= range.rowEnd; r++) {
    for (let c = range.colStart; c <= range.colEnd; c++) {
      const prop = props[c];
      const page = pages[r];
      if (prop && page && isClearableType(prop.type)) {
        writes.push({ pageId: page.id, propId: prop.id, value: clearValueFor(prop.type) });
      }
    }
  }
  return writes;
}
