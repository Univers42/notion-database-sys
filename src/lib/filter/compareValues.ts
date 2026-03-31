// ─── compareValues — pure sort comparator for property values ────────────────

/**
 * Compare two property values for sorting.
 *
 * @param a - First value
 * @param b - Second value
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns negative if a < b, 0 if equal, positive if a > b (adjusted for direction)
 */
export function compareValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  const mult = direction === 'asc' ? 1 : -1;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b) * mult;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * mult;
  if (typeof a === 'boolean' && typeof b === 'boolean') return ((a ? 1 : 0) - (b ? 1 : 0)) * mult;
  return String(a).localeCompare(String(b)) * mult;
}
