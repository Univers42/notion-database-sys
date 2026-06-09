/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveValueCodec.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/09 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/09 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Engine row values → notion cell values for the live-mapped properties
 * (see liveSchemaMapper for the type mapping). Decode rules:
 * - number stays number (string numerics coerced, non-finite → null)
 * - checkbox → boolean; date → the ISO string shape the views format
 * - relation: the FK scalar becomes `[<live page id>]` in the target table
 *   (`baas:<dbId>:<refTable>:<fk>`) so the views resolve names lazily
 * - array → multi_select string values; json/objectid/unknown → display string
 * The encode direction (UI → wire) returns `undefined` for properties that must
 * never be written ('id'-typed read-only renders, formula/rollup/…): callers
 * SKIP undefined. Encoding is idempotent (encode(encode(x)) === encode(x)) so
 * the state diff can compare property-level encodings while the publisher
 * re-encodes column-aware (date vs datetime, numeric FKs) before sending.
 */

import type { SchemaProperty } from '../../component/types';
// Type-only (erased at runtime): node:test never needs to resolve the alias.
import type { PropertyValue } from '@notion-db/contract-types';
import {
  formatLivePageId,
  parseLivePageId,
  type LiveColumnSchema,
  type LiveMountRef,
} from './liveTypes';

/** Property types the write path encodes; everything else is skipped. */
const ENCODABLE_TYPES = new Set([
  'title', 'text', 'url', 'email', 'phone', 'checkbox', 'number',
  'date', 'select', 'multi_select', 'relation',
]);
const NUMERIC_COLUMN_TYPES = new Set(['integer', 'float', 'decimal']);

/** Scalar → display string (objects become compact JSON, never `[object …]`). */
export function toDisplayString(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'bigint') {
    return String(raw);
  }
  try {
    return JSON.stringify(raw) ?? '';
  } catch {
    return String(raw);
  }
}

/** Lenient numeric coercion: numbers pass, numeric strings parse, else null. */
export function toNumberValue(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** One engine cell → the notion value shape its mapped property expects. */
export function decodeLiveValue(
  raw: unknown,
  property: SchemaProperty,
  column: LiveColumnSchema | undefined,
  mount: LiveMountRef,
): PropertyValue {
  if (raw === null || raw === undefined) {
    if (property.type === 'title') return '';
    if (property.type === 'relation' || property.type === 'multi_select') return [];
    return null;
  }
  switch (property.type) {
    case 'title':
      return toDisplayString(raw);
    case 'checkbox':
      return Boolean(raw);
    case 'number':
      return toNumberValue(raw);
    case 'date':
      return toDisplayString(raw); // ISO string — the shape used by seed state
    case 'select':
      return toDisplayString(raw); // option ids = raw values (liveSchemaMapper)
    case 'multi_select':
      return Array.isArray(raw) ? raw.map(toDisplayString) : [toDisplayString(raw)];
    case 'relation': {
      const refTable = column?.references?.table;
      if (!refTable) return [];
      return [formatLivePageId({ dbId: mount.dbId, table: refTable }, toDisplayString(raw))];
    }
    default:
      return toDisplayString(raw); // text + read-only `id` presentation
  }
}

/** Date cell → wire: `date` columns get YYYY-MM-DD, `datetime` columns get the
 *  full ISO string; without column metadata the stored string passes through. */
export function encodeDateValue(value: PropertyValue, column?: LiveColumnSchema): unknown {
  const text = toDisplayString(value);
  if (text.trim() === '') return null;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return text; // not parseable — pass through verbatim
  if (column?.normalized_type === 'date') {
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : new Date(parsed).toISOString().slice(0, 10);
  }
  if (column?.normalized_type === 'datetime') return new Date(parsed).toISOString();
  return text;
}

/**
 * Notion cell value → engine value (UI → wire). Returns `undefined` for
 * properties that must never be written (read-only 'id' renders, unsupported
 * types) — callers skip undefined. Idempotent per type (see module doc).
 */
export function encodeLiveValue(
  value: PropertyValue,
  property: SchemaProperty,
  column?: LiveColumnSchema,
): unknown {
  if (!ENCODABLE_TYPES.has(property.type)) return undefined;
  if (value === null || value === undefined) {
    return property.type === 'title' ? '' : null;
  }
  switch (property.type) {
    case 'title':
      return toDisplayString(value);
    case 'checkbox':
      return Boolean(value);
    case 'number':
      return toNumberValue(value);
    case 'date':
      return encodeDateValue(value, column);
    case 'select': {
      const id = toDisplayString(value); // option id === raw value (liveSchemaMapper)
      return id === '' ? null : id;
    }
    case 'multi_select':
      return (Array.isArray(value) ? value : [value]).map(toDisplayString);
    case 'relation': {
      const first = Array.isArray(value) ? value[0] : value;
      if (first === null || first === undefined || first === '') return null; // empty → NULL FK
      const ref = typeof first === 'string' ? parseLivePageId(first) : null;
      const pk = ref ? ref.pk : toDisplayString(first); // non-live id = already a pk (idempotent)
      if (column && NUMERIC_COLUMN_TYPES.has(column.normalized_type)) {
        const numeric = toNumberValue(pk);
        if (numeric !== null) return numeric;
      }
      return pk;
    }
    default: { // text | url | email | phone
      if (column?.normalized_type === 'json' && typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value; // not valid JSON — pass the string through
        }
      }
      return toDisplayString(value);
    }
  }
}
