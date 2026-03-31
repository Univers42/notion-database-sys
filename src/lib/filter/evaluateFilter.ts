// ─── evaluateFilter — test a single filter against a page ───────────────────

import type { Page, Filter, SchemaProperty, FilterOperator } from '../../types/database';
import { containsValue, isEmpty } from './filterHelpers';

/**
 * Evaluate a single filter against a page.
 *
 * @param page - The page whose property is being tested
 * @param filter - The filter condition to evaluate
 * @param property - The schema definition of the property (for type context)
 * @returns true if the page passes the filter
 *
 * @example
 * evaluateFilter(page, { id: '1', propertyId: 'p1', operator: 'equals', value: 'Done' }, prop)
 * // → true if page.properties.p1 === 'Done'
 */
export function evaluateFilter(
  page: Page,
  filter: Filter,
  property: SchemaProperty | undefined,
): boolean {
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
      return typeof val === 'string' && new Date(val) < new Date(fv as string);
    case 'is_after':
      return typeof val === 'string' && new Date(val) > new Date(fv as string);
    case 'is_on_or_before':
      return typeof val === 'string' && new Date(val) <= new Date(fv as string);
    case 'is_on_or_after':
      return typeof val === 'string' && new Date(val) >= new Date(fv as string);
    case 'is_between': {
      if (typeof val !== 'string' || !Array.isArray(fv) || fv.length < 2) return false;
      const d = new Date(val);
      return d >= new Date(fv[0]) && d <= new Date(fv[1]);
    }
    case 'is_relative_to_today': {
      if (typeof val !== 'string') return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = new Date(val);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }
    case 'is_checked':
      return val === true;
    case 'is_not_checked':
      return val !== true;
    default:
      return true;
  }
}
