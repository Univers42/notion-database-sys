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
 * Values travel as the labels a person sees ("Alpha, Beta", "Yes") and are
 * coerced back per column type on paste.
 *
 * Caveat: relation, files, place and custom cells copy as text but never paste
 * from text (an id cannot be recovered from a title), so those cells are left
 * unchanged. A paste is clipped to the existing rows; it never adds rows.
 */

import type { Page, SchemaProperty } from '../../../types/database';
import { CLEAR_VALUE_BY_TYPE, isClearableType, type CellRange } from './gridKeyboard';

export interface CellWrite {
  pageId: string;
  propId: string;
  value: unknown;
}

const NEEDS_QUOTES = /[\t\n\r"]/;
const TEXT_PASTE_TYPES = new Set(['title', 'text', 'url', 'email', 'phone', 'person', 'user']);
const CHECKED = new Set(['yes', 'true', '1', '✓', 'x', 'checked']);
const UNCHECKED = new Set(['no', 'false', '0', '', 'unchecked']);

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

function optionLabel(id: unknown, prop: SchemaProperty): string {
  const option = prop.options?.find(o => o.id === id);
  return option ? option.value : String(id);
}

function displayText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const named = value as { name?: unknown; title?: unknown; address?: unknown; url?: unknown };
    const label = [named.name, named.title, named.address, named.url].find(v => typeof v === 'string');
    return typeof label === 'string' ? label : '';
  }
  return String(value);
}

/** The text a cell copies as: option labels, Yes/No, related page titles. */
export function cellToText(value: unknown, prop: SchemaProperty, titleOf?: (pageId: string) => string): string {
  if (value === null || value === undefined) return '';
  switch (prop.type) {
    case 'checkbox': return value ? 'Yes' : 'No';
    case 'select':
    case 'status': return value === '' ? '' : optionLabel(value, prop);
    case 'multi_select': return (Array.isArray(value) ? value : [value]).map(id => optionLabel(id, prop)).join(', ');
    case 'relation':
      return titleOf ? (Array.isArray(value) ? value : [value]).map(id => titleOf(String(id))).filter(Boolean).join(', ') : displayText(value);
    default: return displayText(value);
  }
}

function optionIdFor(label: string, prop: SchemaProperty): string | undefined {
  const wanted = label.trim().toLowerCase();
  return prop.options?.find(o => o.id === label.trim() || o.value.toLowerCase() === wanted)?.id;
}

/** The value pasted text becomes in this column, or undefined to leave the
 *  cell unchanged (read-only column, or text that does not parse). */
export function textToCellValue(text: string, prop: SchemaProperty): unknown {
  if (!isClearableType(prop.type)) return undefined;
  const trimmed = text.trim();
  if (prop.type === 'checkbox') {
    const word = trimmed.toLowerCase();
    if (CHECKED.has(word)) return true;
    return UNCHECKED.has(word) ? false : undefined;
  }
  if (trimmed === '') return CLEAR_VALUE_BY_TYPE[prop.type] ?? '';
  switch (prop.type) {
    case 'number': {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'date':
    case 'due_date': return Number.isNaN(Date.parse(trimmed)) ? undefined : trimmed;
    case 'select':
    case 'status': return prop.options?.length ? optionIdFor(trimmed, prop) : trimmed;
    case 'multi_select': {
      const labels = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      if (!prop.options?.length) return labels;
      const ids = labels.map(label => optionIdFor(label, prop)).filter((id): id is string => id !== undefined);
      return ids.length ? [...new Set(ids)] : undefined;
    }
    default: return TEXT_PASTE_TYPES.has(prop.type) ? text : undefined;
  }
}

/** The range as spreadsheet text. */
export function copyRange(range: CellRange, pages: Page[], props: SchemaProperty[], titleOf?: (pageId: string) => string): string {
  const rows: string[][] = [];
  for (let r = range.rowStart; r <= range.rowEnd; r++) {
    const page = pages[r];
    if (!page) continue;
    const row: string[] = [];
    for (let c = range.colStart; c <= range.colEnd; c++) {
      const prop = props[c];
      if (prop) row.push(cellToText(page.properties[prop.id], prop, titleOf));
    }
    rows.push(row);
  }
  return toTsv(rows);
}

/** The writes a paste makes. One copied value fills every selected cell;
 *  a larger block lands from the range's top-left cell, clipped to the grid. */
export function planPaste(clipboard: string[][], range: CellRange, pages: Page[], props: SchemaProperty[]): CellWrite[] {
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
      const value = textToCellValue(single ? source[0] : source[c - range.colStart], prop);
      if (value !== undefined) writes.push({ pageId: page.id, propId: prop.id, value });
    }
  }
  return writes;
}

/** The writes that empty every writable cell of the range (Delete, cut). */
export function planClear(range: CellRange, pages: Page[], props: SchemaProperty[]): CellWrite[] {
  const writes: CellWrite[] = [];
  for (let r = range.rowStart; r <= range.rowEnd; r++) {
    for (let c = range.colStart; c <= range.colEnd; c++) {
      const prop = props[c];
      const page = pages[r];
      if (prop && page && isClearableType(prop.type)) {
        writes.push({ pageId: page.id, propId: prop.id, value: CLEAR_VALUE_BY_TYPE[prop.type] ?? '' });
      }
    }
  }
  return writes;
}
