/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pageUtils.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Page-level utility functions
// ═══════════════════════════════════════════════════════════════════════════════

import type { Page, DatabaseSchema } from '../types/database';

/** Resolves the display title of a page from its database schema */
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

/** Checks whether a page has any non-empty property values */
export function pageHasContent(page: Page): boolean {
  return Object.values(page.properties).some(v =>
    v !== null && v !== undefined && v !== '' &&
    !(Array.isArray(v) && v.length === 0)
  );
}

/** Returns pages filtered and sorted by updatedAt descending */
export function recentPages<T extends { updatedAt: string }>(
  pages: readonly T[],
  limit = 10,
): T[] {
  return [...pages]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
