/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   sourceRemap.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Pure view rebinding: when a view's Source changes, every property reference
 * it carries (filters, sorts, grouping, axis/calendar/timeline/map settings,
 * visible columns) is remapped onto the new database — by property id when it
 * exists there, else by case-insensitive NAME within a compatible type family
 * (Notion semantics: a "Status" select keeps working across sources), else
 * dropped/cleared. No store imports; bindViewSource owns the state merge.
 */

import type { DatabaseSchema, PropertyType, ViewConfig } from '../component/types';
import type { ViewSettings } from '../types/database';

/** Settings keys holding a property id, remapped like filters/sorts. */
const PROPERTY_SETTING_KEYS = [
  'xAxisProperty', 'yAxisProperty', 'yAxisGroupBy',
  'showCalendarBy', 'showTimelineBy', 'timelineEndBy', 'mapBy',
] as const;

/** Property types interchangeable enough to survive a name-based remap. */
const TYPE_FAMILIES: PropertyType[][] = [
  ['text', 'title', 'url', 'email', 'phone'],
  ['select', 'multi_select', 'status'],
  ['date', 'created_time', 'last_edited_time', 'due_date'],
  ['user', 'person', 'assigned_to'],
];

function compatibleTypes(a: PropertyType, b: PropertyType): boolean {
  if (a === b) return true;
  return TYPE_FAMILIES.some((family) => family.includes(a) && family.includes(b));
}

/** old property id → new property id (only ids that survive the move). */
export function buildPropertyMap(
  oldDb: DatabaseSchema | null,
  newDb: DatabaseSchema,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!oldDb) return map;
  const candidates = Object.values(newDb.properties);
  for (const property of Object.values(oldDb.properties)) {
    if (newDb.properties[property.id]) {
      map[property.id] = property.id;
      continue;
    }
    const name = property.name.trim().toLowerCase();
    const byName = candidates.find(
      (candidate) => candidate.name.trim().toLowerCase() === name
        && compatibleTypes(candidate.type, property.type),
    );
    if (byName) map[property.id] = byName.id;
  }
  return map;
}

/** Settings with property refs remapped; chart group bookkeeping
 *  (hiddenGroups/manualGroupOrder) survives only if the x property did. */
function remapSettings(settings: ViewSettings, map: Record<string, string>): ViewSettings {
  const next: ViewSettings = { ...settings };
  for (const key of PROPERTY_SETTING_KEYS) {
    const current = next[key];
    if (current === undefined) continue;
    const mapped = map[current];
    if (mapped) next[key] = mapped;
    else delete next[key];
  }
  if (settings.xAxisProperty && !map[settings.xAxisProperty]) {
    delete next.hiddenGroups;
    delete next.manualGroupOrder;
  }
  return next;
}

/** The view bound to `newDb`, with all property references remapped. */
export function remapViewToSource(
  view: ViewConfig,
  oldDb: DatabaseSchema | null,
  newDb: DatabaseSchema,
): ViewConfig {
  const map = buildPropertyMap(oldDb, newDb);
  const grouping = view.grouping && map[view.grouping.propertyId]
    ? { ...view.grouping, propertyId: map[view.grouping.propertyId] }
    : undefined;
  const subGrouping = view.subGrouping && map[view.subGrouping.propertyId]
    ? { propertyId: map[view.subGrouping.propertyId] }
    : undefined;
  const visible = view.visibleProperties
    .map((id) => map[id])
    .filter((id): id is string => Boolean(id));
  return {
    ...view,
    databaseId: newDb.id,
    filters: view.filters
      .filter((filter) => map[filter.propertyId])
      .map((filter) => ({ ...filter, propertyId: map[filter.propertyId] })),
    sorts: view.sorts
      .filter((sort) => map[sort.propertyId])
      .map((sort) => ({ ...sort, propertyId: map[sort.propertyId] })),
    grouping,
    subGrouping,
    visibleProperties: visible.length > 0 ? visible : Object.keys(newDb.properties),
    settings: remapSettings(view.settings ?? {}, map),
  };
}
