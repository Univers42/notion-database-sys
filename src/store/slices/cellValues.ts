/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   cellValues.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── cellValues — the value a cell HAS, stored or computed ─────────────────
// Formula, rollup and created/edited-time columns keep nothing in
// page.properties, so every reader of the raw map (filter, sort, group, stat
// tiles, charts, conditional colors) saw them as empty. This is the one place
// that resolves them; readers go through cellValue / sortKey.

import type { Page, DatabaseSchema, SchemaProperty } from '../../types/database';
import { evalFormula, isWasmReady, validateFormula, FORMULA_ENGINE_UNAVAILABLE } from '../../lib/engine/bridge';
import { getCachedFormula, setCachedFormula } from '../../lib/formula/formulaCache';
import { computeRollup } from './storeHelpers';

export interface CellValueSource {
  pages: Record<string, Page>;
  databases: Record<string, DatabaseSchema>;
}

/** Formula → rollup → formula chains deeper than this are treated as a cycle. */
const MAX_DEPTH = 8;
const DEPS_CACHE_MAX = 1_000;
const dependencyCache = new Map<string, ReadonlySet<string>>();

function formulaDependencies(expression: string): ReadonlySet<string> {
  let deps = dependencyCache.get(expression);
  if (!deps) {
    if (dependencyCache.size >= DEPS_CACHE_MAX) dependencyCache.clear();
    deps = new Set(validateFormula(expression).dependencies);
    dependencyCache.set(expression, deps);
  }
  return deps;
}

/** Option label of a select-ish stored value. Some sources (workspace / live
 *  tables) store the label itself, which then passes through unchanged. */
export function optionLabel(prop: SchemaProperty, raw: unknown): unknown {
  if (typeof raw !== 'string') return raw ?? null;
  return prop.options?.find(o => o.id === raw)?.value ?? raw;
}

function pageTitle(source: CellValueSource, pageId: unknown): string | null {
  if (typeof pageId !== 'string') return null;
  const page = source.pages[pageId];
  const db = page ? source.databases[page.databaseId] : undefined;
  const title = db ? page.properties[db.titlePropertyId] : undefined;
  return typeof title === 'string' ? title : null;
}

function toDate(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const date = raw instanceof Date ? raw : new Date(raw as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

function propertyOf(source: CellValueSource, page: Page, propertyId: string): SchemaProperty | undefined {
  return source.databases[page.databaseId]?.properties[propertyId];
}

/**
 * The value a formula's `prop("X")` and a rollup aggregate read — Notion
 * semantics: option LABELS (the editor's own example is `prop("Status") ==
 * "Done"`), related page titles, real dates, and computed columns evaluated.
 */
export function semanticValue(source: CellValueSource, page: Page, prop: SchemaProperty, depth = 0): unknown {
  const raw = page.properties[prop.id];
  switch (prop.type) {
    case 'select':
    case 'status':
      return optionLabel(prop, raw);
    case 'multi_select':
      return Array.isArray(raw) ? raw.map(item => optionLabel(prop, item)) : [];
    case 'relation':
      return Array.isArray(raw) ? raw.map(id => pageTitle(source, id)).filter(t => t !== null) : [];
    case 'date':
    case 'due_date':
      return toDate(raw);
    case 'created_time':
      return toDate(page.createdAt);
    case 'last_edited_time':
      return toDate(page.updatedAt);
    case 'created_by':
      return page.createdBy || null;
    case 'last_edited_by':
      return page.lastEditedBy || null;
    case 'checkbox':
      return raw === true;
    case 'formula':
      return formulaValue(source, page, prop, depth + 1);
    case 'rollup':
      return rollupValue(source, page, prop, depth + 1);
    default:
      return raw ?? null;
  }
}

/** Typed formula result (number, text, boolean, Date, array, or null when
 *  empty); an engine failure surfaces as its sentinel string. */
export function formulaValue(source: CellValueSource, page: Page, prop: SchemaProperty, depth = 0): unknown {
  const expression = prop.formulaConfig?.expression;
  if (!expression || depth > MAX_DEPTH) return null;
  if (!isWasmReady()) return FORMULA_ENGINE_UNAVAILABLE;
  const db = source.databases[page.databaseId];
  if (!db) return null;
  const deps = formulaDependencies(expression);
  const inputs: Record<string, unknown> = {};
  for (const sp of Object.values(db.properties)) {
    if (sp.id !== prop.id && deps.has(sp.name)) inputs[sp.name] = semanticValue(source, page, sp, depth);
  }
  const inputsKey = JSON.stringify(inputs);
  const cached = getCachedFormula(expression, inputsKey);
  if (cached !== undefined) return cached;
  const result = evalFormula(expression, inputs);
  const value = result === '' ? null : result;
  setCachedFormula(expression, inputsKey, value);
  return value;
}

/** Rollup aggregate over the related pages' semantic values of the target. */
export function rollupValue(source: CellValueSource, page: Page, prop: SchemaProperty, depth = 0): unknown {
  const config = prop.rollupConfig;
  if (!config || depth > MAX_DEPTH) return null;
  const ids = page.properties[config.relationPropertyId];
  const related = (Array.isArray(ids) ? ids : [])
    .map((id: string) => source.pages[id])
    .filter((p): p is Page => Boolean(p) && !p.archived);
  const values = related.map(rp => {
    const target = propertyOf(source, rp, config.targetPropertyId);
    return target ? semanticValue(source, rp, target, depth) : rp.properties[config.targetPropertyId];
  });
  return computeRollup(config.function, values);
}

/** Dates become ISO strings so date filters and string sorts read them. */
function toCell(value: unknown): unknown {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (Array.isArray(value)) return value.map(toCell);
  const range = value as { start?: unknown } | null;
  if (range && typeof range === 'object' && range.start instanceof Date) return toCell(range.start);
  return value;
}

/**
 * The value filters, grouping, stat tiles, charts and conditional colors
 * compare against. Stored columns keep their raw value (filter editors pick
 * option IDS); computed columns are resolved.
 */
export function cellValue(source: CellValueSource, page: Page, prop: SchemaProperty): unknown {
  switch (prop.type) {
    case 'formula': return toCell(formulaValue(source, page, prop));
    case 'rollup': return toCell(rollupValue(source, page, prop));
    case 'created_time': return page.createdAt || null;
    case 'last_edited_time': return page.updatedAt || null;
    case 'created_by': return page.createdBy || null;
    case 'last_edited_by': return page.lastEditedBy || null;
    default: return page.properties[prop.id];
  }
}

/** Position of a select-ish value in the option list; unknown labels after. */
function optionRank(prop: SchemaProperty, raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const options = prop.options ?? [];
  const index = options.findIndex(o => o.id === raw || o.value === raw);
  return index === -1 ? options.length : index;
}

/**
 * Sort key of a cell. Select and status sort by option order (Notion), not
 * by the option id string; multi-values by their labels; an ID by its number,
 * so `TR-2` sorts before `TR-10`.
 */
export function sortKey(source: CellValueSource, page: Page, prop: SchemaProperty): unknown {
  const raw = page.properties[prop.id];
  switch (prop.type) {
    case 'select':
    case 'status':
      return optionRank(prop, raw);
    case 'multi_select':
    case 'relation': {
      const labels = semanticValue(source, page, prop) as unknown[];
      return labels.length ? labels.join(', ') : null;
    }
    case 'id': {
      const digits = typeof raw === 'string' ? /(\d+)$/.exec(raw) : null;
      return digits ? Number(digits[1]) : raw;
    }
    default:
      return cellValue(source, page, prop);
  }
}

const COMPUTED_TYPES: ReadonlySet<string> = new Set([
  'formula', 'rollup', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by',
]);

/** Columns whose value lives outside page.properties. */
export function isComputedProperty(prop: SchemaProperty | undefined): prop is SchemaProperty {
  return prop !== undefined && COMPUTED_TYPES.has(prop.type);
}

/** Pages with the given computed columns written into `properties`, for
 *  engines that only read the raw map (charts). Untouched when none is. */
export function withComputedCells<P extends Page>(
  pages: readonly P[],
  props: readonly (SchemaProperty | undefined)[],
  read: (page: P, propertyId: string) => unknown,
): readonly P[] {
  const computed = props.filter(isComputedProperty);
  if (computed.length === 0) return pages;
  return pages.map(page => {
    const properties = { ...page.properties };
    for (const prop of computed) properties[prop.id] = read(page, prop.id);
    return { ...page, properties };
  });
}
