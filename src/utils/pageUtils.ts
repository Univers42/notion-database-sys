/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pageUtils.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:16:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Page, DatabaseSchema } from '../types/database';

/**
 * Resolves the display title of a page from its database schema.
 *
 * Looks up the title property via `database.titlePropertyId`, reads the
 * corresponding value from `page.properties`, and returns it if non-empty.
 *
 * @param page     - The page whose title to resolve.
 * @param database - The database schema (provides `titlePropertyId`).
 * @param fallback - String to return when no title is found. Default "Untitled".
 */
export function getPageDisplayTitle(
  page: Page,
  database: DatabaseSchema,
  fallback = 'Untitled',
): string {
  const titlePropId = database.titlePropertyId;
  if (!titlePropId) return fallback;
  const val = page.properties[titlePropId];
  if (typeof val === 'string' && val.trim()) return val;
  return fallback;
}

/** Returns true if a page has at least one non-empty property value. */
export function pageHasContent(page: Page): boolean {
  return Object.values(page.properties).some(v =>
    v !== null && v !== undefined && v !== '' &&
    !(Array.isArray(v) && v.length === 0)
  );
}

/**
 * Returns pages sorted by `updatedAt` descending, limited to `limit` entries.
 *
 * @param limit - Maximum number of pages to return. Default 10.
 */
export function recentPages<T extends { updatedAt: string }>(
  pages: readonly T[],
  limit = 10,
): T[] {
  return [...pages]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
