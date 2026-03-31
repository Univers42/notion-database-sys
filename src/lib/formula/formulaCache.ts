/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   formulaCache.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:40:29 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:40:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── formulaCache — LRU-style cache for WASM formula evaluations ────────────

const FORMULA_CACHE_MAX = 10_000;

const formulaCache = new Map<string, unknown>();

function buildKey(expression: string, pageId: string, updatedAt: string): string {
  return `${expression}::${pageId}::${updatedAt}`;
}

/**
 * Retrieve a cached formula result.
 *
 * @param expression - The formula expression string
 * @param pageId - The page the formula is evaluated for
 * @param updatedAt - Timestamp for cache invalidation
 * @returns The cached value, or undefined if not cached
 */
export function getCachedFormula(expression: string, pageId: string, updatedAt: string): unknown | undefined {
  return formulaCache.get(buildKey(expression, pageId, updatedAt));
}

/**
 * Store a computed formula result in the cache.
 *
 * @param expression - The formula expression string
 * @param pageId - The page the formula is evaluated for
 * @param updatedAt - Timestamp for cache invalidation
 * @param value - The computed result to cache
 */
export function setCachedFormula(expression: string, pageId: string, updatedAt: string, value: unknown): void {
  if (formulaCache.size >= FORMULA_CACHE_MAX) {
    evictOldest();
  }
  formulaCache.set(buildKey(expression, pageId, updatedAt), value);
}

/** Evict the oldest 25% of entries. */
export function evictOldest(): void {
  const keys = formulaCache.keys();
  const evictCount = FORMULA_CACHE_MAX / 4;
  for (let i = 0; i < evictCount; i++) {
    const k = keys.next();
    if (k.done) break;
    formulaCache.delete(k.value);
  }
}
