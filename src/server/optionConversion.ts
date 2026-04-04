/** @file optionConversion.ts — Option ID ↔ display value conversion helpers. */

import { safeString } from '../utils/safeString';
import type { SchemaProp } from './dbmsTypes';
import { OPTION_TYPES } from './dbmsTypes';

/** Convert a single display value → option ID  (select / status). */
export function displayToId(val: unknown, prop: SchemaProp): unknown {
  if (val == null || val === '') return val;
  const opts = prop.options ?? [];
  if (opts.length === 0) return val;
  const s = safeString(val);
  // Already an option ID?
  if (opts.some(o => o.id === s)) return s;
  // Match by display value (case-insensitive)
  const byVal = opts.find(o => o.value.toLowerCase() === s.toLowerCase());
  return byVal ? byVal.id : val;
}

/** Convert multi-select display values → option IDs (deduped). */
export function displayArrayToIds(val: unknown, prop: SchemaProp): unknown {
  if (!Array.isArray(val)) return val == null ? val : displayArrayToIds([val], prop);
  const opts = prop.options ?? [];
  if (opts.length === 0) return val;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of val) {
    const s = String(item);
    // Already an option ID?
    let resolved = opts.some(o => o.id === s) ? s : undefined;
    if (!resolved) {
      const byVal = opts.find(o => o.value.toLowerCase() === s.toLowerCase());
      if (byVal) resolved = byVal.id;
    }
    const id = resolved ?? s;
    if (!seen.has(id)) { seen.add(id); result.push(id); }
  }
  return result;
}

/** Normalise all properties of a page from display values → option IDs. */
export function normalizePageToOptionIds(
  properties: Record<string, unknown>,
  schema: Record<string, SchemaProp>,
): Record<string, unknown> {
  const out = { ...properties };
  for (const [propId, prop] of Object.entries(schema)) {
    if (!(propId in out) || !OPTION_TYPES.has(prop.type)) continue;
    const raw = out[propId];
    if (raw == null) continue;
    if (prop.type === 'multi_select') {
      out[propId] = displayArrayToIds(raw, prop);
    } else {
      out[propId] = displayToId(raw, prop);
    }
  }
  return out;
}

/** Convert a single option ID → display value  (select / status). */
export function idToDisplay(val: unknown, prop: SchemaProp): unknown {
  if (val == null || val === '') return val;
  const opts = prop.options ?? [];
  if (opts.length === 0) return val;
  const s = safeString(val);
  const byId = opts.find(o => o.id === s);
  return byId ? byId.value : val;            // already a display value? pass through
}

/** Convert multi-select option IDs → display values. */
export function idsToDisplayArray(val: unknown, prop: SchemaProp): unknown {
  if (!Array.isArray(val)) return val;
  const opts = prop.options ?? [];
  if (opts.length === 0) return val;
  return val.map(item => {
    const s = String(item);
    const byId = opts.find(o => o.id === s);
    return byId ? byId.value : s;
  });
}

/** Convert a property value from internal (option ID) to DB-friendly display value.
 *  Only affects select / status / multi_select; everything else passes through. */
export function convertValueToDisplay(value: unknown, prop: SchemaProp | undefined): unknown {
  if (!prop || !OPTION_TYPES.has(prop.type)) return value;
  if (prop.type === 'multi_select') return idsToDisplayArray(value, prop);
  return idToDisplay(value, prop);
}
