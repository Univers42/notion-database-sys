/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   storeHelpers.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:50 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Page, DatabaseSchema, SchemaProperty } from '../../types/database';
import { safeString } from '../../utils/safeString';

function computeMedian(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Search a page's properties against a query string.
 * Handles select, multi_select, relation, checkbox, and generic types.
 */
export function searchPage(
  page: Page,
  q: string,
  db: DatabaseSchema,
  state: { pages: Record<string, Page>; databases: Record<string, DatabaseSchema> },
): boolean {
  return Object.entries(page.properties).some(([propId, val]) => {
    if (val == null || val === '') return false;
    const prop = db.properties[propId];
    if (!prop) return typeof val === 'string' && val.toLowerCase().includes(q);

    switch (prop.type) {
      case 'select':
      case 'status': {
        const opt = prop.options?.find(o => o.id === val);
        return opt ? opt.value.toLowerCase().includes(q) : false;
      }
      case 'multi_select':
        return Array.isArray(val) && val.some((id: string) => {
          const opt = prop.options?.find(o => o.id === id);
          return opt ? opt.value.toLowerCase().includes(q) : false;
        });
      case 'relation':
        return Array.isArray(val) && val.some((rid: string) => {
          const rp = state.pages[rid];
          if (!rp) return false;
          const rd = state.databases[rp.databaseId];
          const tp = rd?.titlePropertyId;
          return tp && typeof rp.properties[tp] === 'string' && rp.properties[tp].toLowerCase().includes(q);
        });
      case 'checkbox':
        return (val ? 'true yes checked' : 'false no unchecked').includes(q);
      default:
        if (typeof val === 'string') return val.toLowerCase().includes(q);
        if (Array.isArray(val)) return val.some((v: unknown) => safeString(v).toLowerCase().includes(q));
        return safeString(val).toLowerCase().includes(q);
    }
  });
}

/**
 * Build grouped page arrays from a grouping property.
 */
export function buildGroups(
  pages: Page[],
  groupProp: SchemaProperty,
  grouping: { propertyId: string; hiddenGroups?: string[] },
  readValue: (page: Page) => unknown = page => page.properties[grouping.propertyId],
): { groupId: string; groupLabel: string; groupColor: string; pages: Page[] }[] {
  if ((groupProp.type === 'select' || groupProp.type === 'status') && groupProp.options) {
    const groups = [
      ...(groupProp.nullable !== false
        ? [{ groupId: '__unassigned__', groupLabel: 'No ' + groupProp.name, groupColor: 'bg-surface-muted text-ink-body', pages: [] as Page[] }]
        : []),
      ...groupProp.options.map(opt => ({ groupId: opt.id, groupLabel: opt.value, groupColor: opt.color, pages: [] as Page[] })),
    ];
    const gm = new Map(groups.map(g => [g.groupId, g]));
    for (const page of pages) {
      const v = readValue(page);
      // Sources that store the option LABEL (workspace / live tables) land in
      // that option's group, not in "No <name>".
      const byLabel = typeof v === 'string' ? groupProp.options.find(o => o.value === v)?.id : undefined;
      (gm.get(v as string) ?? (byLabel ? gm.get(byLabel) : undefined) ?? gm.get('__unassigned__'))?.pages.push(page);
    }
    const hidden = grouping.hiddenGroups || [];
    // An empty "No <name>" group is a header over nothing: every row has a
    // value. It returns as soon as one row loses its value.
    return groups.filter(g => !hidden.includes(g.groupId) && !(g.groupId === '__unassigned__' && g.pages.length === 0));
  }

  if (groupProp.type === 'checkbox') {
    const checked: Page[] = [];
    const unchecked: Page[] = [];
    for (const p of pages) {
      (readValue(p) === true ? checked : unchecked).push(p);
    }
    return [
      { groupId: 'unchecked', groupLabel: 'Unchecked', groupColor: 'bg-surface-muted text-ink-body', pages: unchecked },
      { groupId: 'checked', groupLabel: 'Checked', groupColor: 'bg-success-surface-medium text-success-text-tag', pages: checked },
    ];
  }

  // Any other type (text/number/place/date/url…): one column per distinct value.
  // Empty values share the '__unassigned__' column so a board drop there clears
  // the value (the drop handler maps '__unassigned__' → null), like the select path.
  const gm = new Map<string, Page[]>();
  for (const p of pages) {
    const raw = readValue(p);
    const empty = raw === null || raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0);
    const v = empty ? '__unassigned__' : safeString(Array.isArray(raw) ? raw.join(', ') : raw);
    if (!gm.has(v)) gm.set(v, []);
    gm.get(v)?.push(p);
  }
  return Array.from(gm.entries()).map(([k, ps]) => ({
    groupId: k, groupLabel: k === '__unassigned__' ? 'Unassigned' : k, groupColor: 'bg-surface-muted text-ink-body', pages: ps,
  }));
}

/** The stored value that puts a page into `groupId` of `buildGroups`, or
 *  `undefined` when no write can (a computed column, a joined multi-value key,
 *  or "empty" on a non-nullable select). */
export function groupPresetValue(groupProp: SchemaProperty, groupId: string): { value: unknown } | undefined {
  const empty = groupId === '__unassigned__';
  switch (groupProp.type) {
    case 'select':
    case 'status':
      return empty && groupProp.nullable === false ? undefined : { value: empty ? null : groupId };
    case 'checkbox':
      return { value: groupId === 'checked' };
    case 'number': {
      if (empty) return { value: null };
      const n = Number(groupId);
      return Number.isFinite(n) ? { value: n } : undefined;
    }
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      return { value: empty ? '' : groupId };
    default:
      return undefined;
  }
}

/** Format a WASM formula engine result for display. */
export function formatFormulaResult(result: unknown): unknown {
  if (result instanceof Date) {
    return Number.isNaN(result.getTime())
      ? undefined
      : result.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (typeof result === 'number') return Number.isFinite(result) ? Math.round(result * 100) / 100 : undefined;
  if (Array.isArray(result)) {
    const parts = result.map(formatFormulaResult).filter(part => part !== undefined && part !== '');
    return parts.length ? parts.map(part => safeString(part)).join(', ') : undefined;
  }
  if (typeof result === 'boolean') return result;
  if (typeof result === 'string' && result !== '') return result;
  const range = result as { start?: unknown; end?: unknown } | null;
  if (range && typeof range === 'object' && range.start instanceof Date) {
    return [formatFormulaResult(range.start), formatFormulaResult(range.end)].filter(Boolean).join(' → ');
  }
  return undefined;
}

/** Compute a rollup aggregation over the related pages' target values.
 *  Multi-value targets (multi-select, relation) are flattened one level, so
 *  "show original" lists labels and counts count labels, not arrays. */
export function computeRollup(fn: string, values: readonly unknown[]): unknown {
  const raw = values.flatMap(v => (Array.isArray(v) ? v : [v]));
  const nonEmpty = raw.filter(v => v !== undefined && v !== null && v !== '' && v !== false);
  const nums = nonEmpty.map(Number).filter(n => !Number.isNaN(n));

  switch (fn) {
    case 'show_original': return raw;
    case 'show_unique': return [...new Set(raw.filter(v => v !== undefined && v !== null))];
    case 'count': case 'count_all': return values.length;
    case 'count_values': return nonEmpty.length;
    case 'count_unique_values': return new Set(nonEmpty.map(v => safeString(v))).size;
    case 'count_empty': return raw.length - nonEmpty.length;
    case 'count_not_empty': return nonEmpty.length;
    case 'percent_empty': return raw.length ? Math.round((raw.length - nonEmpty.length) / raw.length * 100) : 0;
    case 'percent_not_empty': return raw.length ? Math.round(nonEmpty.length / raw.length * 100) : 0;
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'average': return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 100) / 100 : 0;
    case 'median': return computeMedian(nums);
    case 'min': return nums.length ? Math.min(...nums) : 0;
    case 'max': return nums.length ? Math.max(...nums) : 0;
    case 'range': return nums.length ? Math.max(...nums) - Math.min(...nums) : 0;
    default: return null;
  }
}
