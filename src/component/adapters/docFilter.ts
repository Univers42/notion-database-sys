/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   docFilter.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:48:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { DocFilter, Page, PageQuery } from '../types';

/** Applies a document-shaped query to an in-memory page list. */
export function applyPageQuery(pages: Page[], query: PageQuery = {}): Page[] {
  let result = query.databaseId
    ? pages.filter(page => page.databaseId === query.databaseId)
    : [...pages];

  const filter = query.filter;
  if (filter) result = result.filter(page => matchesDocFilter(page, filter));
  if (query.sort?.length) result = sortPages(result, query.sort);
  if (query.limit !== undefined) result = result.slice(0, Math.max(0, query.limit));

  return result;
}

/** Returns true when a page satisfies every property condition in a DocFilter. */
export function matchesDocFilter(page: Page, filter: DocFilter): boolean {
  return Object.entries(filter).every(([propertyId, operators]) => {
    const value = getDocValue(page, propertyId);
    return Object.entries(operators).every(([operator, expected]) => {
      switch (operator) {
        case 'eq': return isEqual(value, expected);
        case 'neq': return !isEqual(value, expected);
        case 'in': return Array.isArray(expected) && expected.some(item => isEqual(value, item));
        case 'nin': return Array.isArray(expected) && expected.every(item => !isEqual(value, item));
        case 'contains': return containsValue(value, expected);
        case 'gt': return compareValues(value, expected) > 0;
        case 'gte': return compareValues(value, expected) >= 0;
        case 'lt': return compareValues(value, expected) < 0;
        case 'lte': return compareValues(value, expected) <= 0;
        case 'exists': return Boolean(expected) === (value !== undefined && value !== null);
        default: return true;
      }
    });
  });
}

function sortPages(pages: Page[], sort: NonNullable<PageQuery['sort']>): Page[] {
  return [...pages].sort((a, b) => {
    for (const item of sort) {
      const comparison = compareValues(getDocValue(a, item.propertyId), getDocValue(b, item.propertyId));
      if (comparison !== 0) return item.direction === 'asc' ? comparison : -comparison;
    }
    return 0;
  });
}

function getDocValue(page: Page, propertyId: string): unknown {
  if (propertyId in page) return page[propertyId as keyof Page];
  return page.properties[propertyId];
}

function containsValue(value: unknown, expected: unknown): boolean {
  if (Array.isArray(value)) return value.some(item => isEqual(item, expected));
  if (typeof value === 'string') return value.includes(String(expected));
  if (value && typeof value === 'object') return Object.values(value).some(item => isEqual(item, expected));
  return isEqual(value, expected);
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  const aNumber = Number(a);
  const bNumber = Number(b);
  if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) return aNumber - bNumber;

  const aDate = Date.parse(String(a));
  const bDate = Date.parse(String(b));
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;

  return String(a).localeCompare(String(b));
}

function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return false;
}
