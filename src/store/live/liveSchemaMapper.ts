/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveSchemaMapper.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/09 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/09 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Live column schema → notion SchemaProperty mapping.
 * - title  = first column named (ci) title|name|label|subject, else the first
 *   text column, else the primary key (string-rendered by the codec).
 * - enum → select (stable option ids = the raw values, matching the views'
 *   `option.id === value` resolution); FK → relation (one_way) targeting
 *   `baas:<dbId>:<refTable>`; boolean → checkbox; numerics → number;
 *   date/datetime → date; array → multi_select; uuid → text.
 * - json/objectid/unknown and `inferred: true` columns map to the `id`
 *   property type: it is in the views' READ_ONLY_TYPES set and renders the
 *   value verbatim (read-only presentation for shapes we can't edit honestly).
 * - `owner_id` / `tenant_id` are platform plumbing → excluded entirely.
 * Property ids = column names (deterministic across reloads).
 */

import type { SchemaProperty } from '../../component/types';
// Type-only (erased at runtime): node:test never needs to resolve the alias.
import type { SelectOption } from '@notion-db/contract-types';
import { formatLiveDatabaseId, type LiveColumnSchema, type LiveTableSchema } from './liveTypes';

/** Platform-plumbing columns hidden from the UI schema. */
export const HIDDEN_LIVE_COLUMNS = new Set(['owner_id', 'tenant_id']);

const TITLE_COLUMN_NAMES = new Set(['title', 'name', 'label', 'subject']);
const NUMERIC_TYPES = new Set(['integer', 'float', 'decimal']);
const READ_ONLY_RENDERED_TYPES = new Set(['json', 'objectid', 'unknown']);

/** Same tag palette the workspace databases synthesize options with. */
const OPTION_COLORS = [
  'bg-accent-muted text-accent-text-bold',
  'bg-success-surface-muted text-success-text-tag',
  'bg-warning-surface-muted text-warning-text-tag',
  'bg-danger-surface-muted text-danger-text-tag',
  'bg-violet-surface-muted text-violet-text-tag',
  'bg-cyan-surface-muted text-cyan-text-tag',
  'bg-pink-surface-muted text-pink-text-tag',
  'bg-surface-muted text-ink-strong',
];

/** Properties of one mapped table + which property is the title. */
export interface LiveTableProperties {
  properties: Record<string, SchemaProperty>;
  titlePropertyId: string;
}

/** "order_items" / "orderItems" → "Order Items". */
export function humanizeName(name: string): string {
  const words = name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return name;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/** Stable select options from enum values: id === value (the views match by id). */
export function enumOptions(values: string[]): SelectOption[] {
  return values.map((value, index) => ({
    id: value,
    value,
    color: OPTION_COLORS[index % OPTION_COLORS.length],
  }));
}

/** The column rendered as the row title (see module doc for the pick order). */
export function pickTitleColumn(table: LiveTableSchema): string {
  const visible = table.columns.filter((column) => !HIDDEN_LIVE_COLUMNS.has(column.name));
  const named = visible.find((column) => TITLE_COLUMN_NAMES.has(column.name.toLowerCase()));
  if (named) return named.name;
  const text = visible.find((column) => column.normalized_type === 'text');
  if (text) return text.name;
  return table.primary_key[0] ?? visible[0]?.name ?? 'id';
}

/** One live column → one notion property (id = column name). */
export function mapLiveColumn(column: LiveColumnSchema, dbId: string): SchemaProperty {
  const base: SchemaProperty = { id: column.name, name: humanizeName(column.name), type: 'text', nullable: column.nullable };
  if (column.references) {
    return {
      ...base,
      type: 'relation',
      relationConfig: {
        databaseId: formatLiveDatabaseId({
          dbId: column.references.dbId ?? dbId, // cross-mount target carries its own dbId
          table: column.references.table,
        }),
        type: 'one_way',
      },
    };
  }
  if (column.inferred || READ_ONLY_RENDERED_TYPES.has(column.normalized_type)) {
    return { ...base, type: 'id' };
  }
  if (column.normalized_type === 'boolean') return { ...base, type: 'checkbox' };
  if (NUMERIC_TYPES.has(column.normalized_type)) return { ...base, type: 'number' };
  if (column.normalized_type === 'date' || column.normalized_type === 'datetime') {
    return { ...base, type: 'date' };
  }
  if (column.normalized_type === 'enum') {
    return { ...base, type: 'select', options: enumOptions(column.enum_values ?? []) };
  }
  if (column.normalized_type === 'array') return { ...base, type: 'multi_select', options: [] };
  return base; // text | uuid → text
}

/** Whole table → property map + title pick (`owner_id`/`tenant_id` excluded). */
export function mapLiveTable(table: LiveTableSchema, dbId: string): LiveTableProperties {
  const titlePropertyId = pickTitleColumn(table);
  const properties: Record<string, SchemaProperty> = {};
  for (const column of table.columns) {
    if (HIDDEN_LIVE_COLUMNS.has(column.name)) continue;
    properties[column.name] = column.name === titlePropertyId
      ? { id: column.name, name: humanizeName(column.name), type: 'title' }
      : mapLiveColumn(column, dbId);
  }
  if (!properties[titlePropertyId]) {
    properties[titlePropertyId] = {
      id: titlePropertyId,
      name: humanizeName(titlePropertyId),
      type: 'title',
    };
  }
  return { properties, titlePropertyId };
}
