/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DbMemoCache.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:10:35 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:10:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Reduces redundant reads for file-based and remote adapters.

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000; // 30 seconds

export class DbMemoCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /** Retrieve a cached value, or `undefined` if missing / expired. */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  /** Store a value with the default TTL. */
  set<T>(key: string, data: T): void {
    this.store.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }

  /** Invalidate a single key. */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Invalidate all keys that start with a given prefix. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Clear the entire cache. */
  clear(): void {
    this.store.clear();
  }
}
