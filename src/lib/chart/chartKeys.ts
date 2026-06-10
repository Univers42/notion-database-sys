/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartKeys.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── chartKeys — resolves a page's grouping key(s) for one property ─────────

import type { SchemaProperty } from '../../types/database';
import type { ChartPageLike, GroupKey } from './chartTypes';
import { NONE_KEY } from './chartTypes';
import { safeString } from '../../utils/safeString';

const CHECKED: GroupKey = { key: 'checked', label: 'Checked', color: '' };
const UNCHECKED: GroupKey = { key: 'unchecked', label: 'Unchecked', color: '' };

/** The "unassigned" group, labelled "No <property>" (Notion convention). */
export function noneGroup(prop: SchemaProperty): GroupKey {
  return { key: NONE_KEY, label: `No ${prop.name}`, color: '' };
}

/** Maps select/status/multi-select option ids to labelled, coloured keys. */
function optionGroups(prop: SchemaProperty, raw: unknown): GroupKey[] {
  const ids = Array.isArray(raw) ? raw : [raw];
  return ids
    .filter(id => id !== null && id !== undefined && id !== '')
    .map(id => {
      const opt = prop.options?.find(o => o.id === id || o.value === id);
      if (opt) return { key: opt.id, label: opt.value, color: opt.color };
      return { key: safeString(id), label: safeString(id), color: '' };
    });
}

/** Generic scalar/array values (relation, person, text, number, url, …). */
function genericGroups(
  prop: SchemaProperty,
  raw: unknown,
  labelResolver?: (propId: string, key: string) => string | undefined,
): GroupKey[] {
  const items = Array.isArray(raw) ? raw : [raw];
  return items
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(v => {
      const key = safeString(v);
      const label = labelResolver?.(prop.id, key) ?? key;
      return { key, label, color: '' };
    });
}

/**
 * Resolves the grouping key(s) a page contributes to for a property.
 *
 * Multi-valued properties (multi-select, relation, people) yield one key per
 * value — the page is counted in each group, matching Notion. Empty values
 * fall into the "No <property>" group; checkboxes treat empty as Unchecked.
 */
export function resolveGroupKeys(
  page: ChartPageLike,
  prop: SchemaProperty,
  labelResolver?: (propId: string, key: string) => string | undefined,
): GroupKey[] {
  const raw = page.properties[prop.id];
  if (prop.type === 'checkbox') return [raw ? CHECKED : UNCHECKED];
  const empty = raw === null || raw === undefined || raw === ''
    || (Array.isArray(raw) && raw.length === 0);
  if (empty) return [noneGroup(prop)];
  if (prop.type === 'select' || prop.type === 'status' || prop.type === 'multi_select') {
    const groups = optionGroups(prop, raw);
    return groups.length > 0 ? groups : [noneGroup(prop)];
  }
  const groups = genericGroups(prop, raw, labelResolver);
  return groups.length > 0 ? groups : [noneGroup(prop)];
}

/**
 * Groups that exist even with zero pages (so "omit zero" has meaning):
 * every select/status option, and both checkbox states.
 */
export function seedGroups(prop: SchemaProperty): GroupKey[] {
  if (prop.type === 'select' || prop.type === 'status' || prop.type === 'multi_select') {
    return (prop.options ?? []).map(o => ({ key: o.id, label: o.value, color: o.color }));
  }
  if (prop.type === 'checkbox') return [CHECKED, UNCHECKED];
  return [];
}
