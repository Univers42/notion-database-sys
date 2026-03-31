/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   storeHelpers.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:50 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:42:51 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── storeHelpers — pure helper functions for computed store methods ─────────

import type { Page, DatabaseSchema, SchemaProperty } from '../../types/database';

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
        if (Array.isArray(val)) return val.some((v: unknown) => String(v).toLowerCase().includes(q));
        return String(val).toLowerCase().includes(q);
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
): { groupId: string; groupLabel: string; groupColor: string; pages: Page[] }[] {
  if ((groupProp.type === 'select' || groupProp.type === 'status') && groupProp.options) {
    const groups = [
      { groupId: '__unassigned__', groupLabel: 'No ' + groupProp.name, groupColor: 'bg-surface-muted text-ink-body', pages: [] as Page[] },
      ...groupProp.options.map(opt => ({ groupId: opt.id, groupLabel: opt.value, groupColor: opt.color, pages: [] as Page[] })),
    ];
    const gm = new Map(groups.map(g => [g.groupId, g]));
    for (const page of pages) {
      const v = page.properties[grouping.propertyId];
      (gm.get(v) || gm.get('__unassigned__')!).pages.push(page);
    }
    const hidden = grouping.hiddenGroups || [];
    return groups.filter(g => !hidden.includes(g.groupId));
  }

  if (groupProp.type === 'checkbox') {
    const checked: Page[] = [];
    const unchecked: Page[] = [];
    for (const p of pages) {
      (p.properties[grouping.propertyId] ? checked : unchecked).push(p);
    }
    return [
      { groupId: 'unchecked', groupLabel: 'Unchecked', groupColor: 'bg-surface-muted text-ink-body', pages: unchecked },
      { groupId: 'checked', groupLabel: 'Checked', groupColor: 'bg-success-surface-medium text-success-text-tag', pages: checked },
    ];
  }

  const gm = new Map<string, Page[]>();
  for (const p of pages) {
    const v = String(p.properties[grouping.propertyId] ?? 'Unassigned');
    if (!gm.has(v)) gm.set(v, []);
    gm.get(v)!.push(p);
  }
  return Array.from(gm.entries()).map(([k, ps]) => ({
    groupId: k, groupLabel: k, groupColor: 'bg-surface-muted text-ink-body', pages: ps,
  }));
}

/** Format a WASM formula engine result for display. */
export function formatFormulaResult(result: unknown): unknown {
  if (result instanceof Date) return result.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (typeof result === 'number' && isFinite(result)) return Math.round(result * 100) / 100;
  if (Array.isArray(result)) return result.join(', ');
  if (typeof result === 'boolean') return result;
  if (typeof result === 'string' && result !== '') return result;
  return undefined;
}

/** Compute a rollup aggregation over related pages. */
export function computeRollup(fn: string, related: Page[], targetPropertyId: string): unknown {
  const raw = related.map(p => p.properties[targetPropertyId]);
  const nonEmpty = raw.filter(v => v !== undefined && v !== null && v !== '' && v !== false);
  const nums = nonEmpty.map(Number).filter(n => !isNaN(n));

  switch (fn) {
    case 'show_original': return raw;
    case 'show_unique': return [...new Set(raw.filter(v => v !== undefined && v !== null))];
    case 'count': case 'count_all': return related.length;
    case 'count_values': return nonEmpty.length;
    case 'count_unique_values': return new Set(nonEmpty).size;
    case 'count_empty': return raw.length - nonEmpty.length;
    case 'count_not_empty': return nonEmpty.length;
    case 'percent_empty': return raw.length ? Math.round((raw.length - nonEmpty.length) / raw.length * 100) : 0;
    case 'percent_not_empty': return raw.length ? Math.round(nonEmpty.length / raw.length * 100) : 0;
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'average': return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 100) / 100 : 0;
    case 'median': {
      if (!nums.length) return 0;
      const s = [...nums].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }
    case 'min': return nums.length ? Math.min(...nums) : 0;
    case 'max': return nums.length ? Math.max(...nums) : 0;
    case 'range': return nums.length ? Math.max(...nums) - Math.min(...nums) : 0;
    default: return null;
  }
}
