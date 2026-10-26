/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   formulaCache.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:40:29 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── formulaCache — LRU-style cache for WASM formula evaluations ────────────

const FORMULA_CACHE_MAX = 10_000;

const formulaCache = new Map<string, unknown>();

// Keyed on the formula's resolved INPUTS, not on the page's updatedAt: a
// formula reading a rollup or a relation title changes when ANOTHER page is
// edited, and the old (pageId, updatedAt) key kept serving the stale value.
// Caveat: a formula calling now() is frozen until one of its inputs changes.
function buildKey(expression: string, inputsKey: string): string {
  return `${expression}\u0000${inputsKey}`;
}

/**
 * Retrieve a cached formula result.
 *
 * @param expression - The formula expression string
 * @param inputsKey - Serialized property values the formula was evaluated on
 * @returns The cached value, or undefined if not cached
 */
export function getCachedFormula(expression: string, inputsKey: string): unknown {
  return formulaCache.get(buildKey(expression, inputsKey));
}

/**
 * Store a computed formula result in the cache.
 *
 * @param expression - The formula expression string
 * @param inputsKey - Serialized property values the formula was evaluated on
 * @param value - The computed result to cache
 */
export function setCachedFormula(expression: string, inputsKey: string, value: unknown): void {
  if (formulaCache.size >= FORMULA_CACHE_MAX) {
    evictOldest();
  }
  formulaCache.set(buildKey(expression, inputsKey), value);
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
