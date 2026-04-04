// ─── filterHelpers — private helper functions for filter evaluation ──────────

import { safeString } from '../../utils/safeString';

/**
 * Check if a value contains another value (string includes or array includes).
 */
export function containsValue(val: unknown, fv: unknown): boolean {
  if (typeof val === 'string') return val.toLowerCase().includes(safeString(fv).toLowerCase());
  if (Array.isArray(val)) return val.includes(fv);
  return false;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array).
 */
export function isEmpty(val: unknown): boolean {
  return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
}
