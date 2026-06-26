/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   placeGeocode.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 09:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 09:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Online geocoding for place names the offline centroid tables don't carry
 * (any city / country / region / address in the world). Resolves through the
 * bridge `/api/geocode` (OpenStreetMap Nominatim), caching every result in
 * memory + localStorage so each unique place hits the network at most once. The
 * sync `cachedPlace` powers instant renders; `useGeocode` resolves a batch of
 * names and re-renders as coordinates arrive.
 */

import React from 'react';
import { requestLive } from './liveMountClient';

type Coords = [number, number];
const STORAGE_KEY = 'osionos:geocode-cache';
const cache = new Map<string, Coords | null>();
const inFlight = new Map<string, Promise<Coords | null>>();

function hydrate(): void {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, Coords>;
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && value.length === 2) cache.set(key, [value[0], value[1]]);
    }
  } catch {
    /* private mode / bad json — start empty */
  }
}
hydrate();

function persist(): void {
  try {
    const obj: Record<string, Coords> = {};
    for (const [key, value] of cache) if (value) obj[key] = value;
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* quota / private mode — cache stays in-memory only */
  }
}

const normalize = (name: string): string => name.trim().toLowerCase();

/** Cached coordinates for a place name, or null if unknown/unresolved (sync). */
export function cachedPlace(name: string): Coords | null {
  return cache.get(normalize(name)) ?? null;
}

/** Resolve a place name to coordinates via the bridge, caching the result. */
export async function resolvePlace(name: string): Promise<Coords | null> {
  const key = normalize(name);
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const pending = (async (): Promise<Coords | null> => {
    try {
      const res = await requestLive<{ lat?: number; lng?: number }>(
        `/api/geocode?q=${encodeURIComponent(name)}`,
        { method: 'GET' },
      );
      const coords: Coords | null = (typeof res?.lat === 'number' && typeof res?.lng === 'number')
        ? [res.lat, res.lng]
        : null;
      cache.set(key, coords); // cache definitive hit AND no-match (avoids re-querying)
      persist();
      return coords;
    } catch {
      return null; // transient failure — leave uncached so it retries
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, pending);
  return pending;
}

/**
 * Resolve a batch of place names. Returns a `normalized-name → coords` map and
 * re-renders the caller as resolutions land. Names already cached resolve
 * synchronously on first render.
 */
export function useGeocode(names: string[]): Record<string, Coords> {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  const joined = names.map(normalize).filter(Boolean).sort().join('|');
  React.useEffect(() => {
    let alive = true;
    const pending = [...new Set(names.map(normalize).filter((key) => key && !cache.has(key)))];
    if (pending.length === 0) return;
    Promise.all(pending.map((key) => resolvePlace(key))).then(() => { if (alive) force(); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);
  const out: Record<string, Coords> = {};
  for (const name of names) {
    const key = normalize(name);
    const coords = cache.get(key);
    if (coords) out[key] = coords;
  }
  return out;
}
