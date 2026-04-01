// ═══════════════════════════════════════════════════════════════════════════════
// Filter / Sort engine — pure functions for evaluating filters and comparisons
// ═══════════════════════════════════════════════════════════════════════════════

import type { Page, Filter, SchemaProperty, FilterOperator } from '../types/database';

/** Evaluate a single filter against a page. */
export function evaluateFilter(page: Page, filter: Filter, property: SchemaProperty | undefined): boolean {
  const val = page.properties[filter.propertyId];
  const fv = filter.value;

  switch (filter.operator as FilterOperator) {
    case 'equals':
      return val === fv;
    case 'not_equals':
      return val !== fv;
    case 'contains':
      return containsValue(val, fv);
    case 'not_contains':
      return !containsValue(val, fv);
    case 'starts_with':
      return typeof val === 'string' && val.toLowerCase().startsWith(String(fv).toLowerCase());
    case 'ends_with':
      return typeof val === 'string' && val.toLowerCase().endsWith(String(fv).toLowerCase());
    case 'is_empty':
      return isEmpty(val);
    case 'is_not_empty':
      return !isEmpty(val);
    case 'greater_than':
      return typeof val === 'number' && val > Number(fv);
    case 'less_than':
      return typeof val === 'number' && val < Number(fv);
    case 'greater_than_or_equal':
      return typeof val === 'number' && val >= Number(fv);
    case 'less_than_or_equal':
      return typeof val === 'number' && val <= Number(fv);
    case 'is_before':
      return typeof val === 'string' && new Date(val) < new Date(fv);
    case 'is_after':
      return typeof val === 'string' && new Date(val) > new Date(fv);
    case 'is_checked':
      return val === true;
    case 'is_not_checked':
      return val !== true;
    default:
      return true;
  }
}

/** Compare two property values for sorting. */
export function compareValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  const mult = direction === 'asc' ? 1 : -1;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b) * mult;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * mult;
  if (typeof a === 'boolean' && typeof b === 'boolean') return ((a ? 1 : 0) - (b ? 1 : 0)) * mult;
  return String(a).localeCompare(String(b)) * mult;
}

// ─── Helpers ───

function containsValue(val: unknown, fv: unknown): boolean {
  if (typeof val === 'string') return val.toLowerCase().includes(String(fv).toLowerCase());
  if (Array.isArray(val)) return val.includes(fv);
  return false;
}

function isEmpty(val: unknown): boolean {
  return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
}
