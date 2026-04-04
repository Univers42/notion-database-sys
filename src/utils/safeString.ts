/**
 * Safely convert an unknown value to its string representation.
 *
 * Unlike `String(val)`, this avoids producing `[object Object]` for
 * non-primitive values by falling back to `JSON.stringify`.
 *
 * @param val - Any value to convert
 * @returns A human-readable string representation
 */
export function safeString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') {
    return String(val);
  }
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString();
  return JSON.stringify(val);
}
