/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   mapModes.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── mapModes — pure math for the map display modes (unit-tested) ───────────
// Clustering is screen-space (a projection callback keeps Leaflet out), so
// clusters merge/split naturally with zoom. Bubble radii scale by √weight —
// perceived AREA tracks the value, the honest encoding for magnitudes.

export type MapDisplayMode = 'pins' | 'clusters' | 'heat' | 'bubbles';

export interface MapModePoint {
  id: string;
  lat: number;
  lng: number;
  /** Value driving heat intensity / bubble size (1 when counting records). */
  weight: number;
  title: string;
  color?: string;
}

export interface MapClusterGroup {
  lat: number;
  lng: number;
  items: MapModePoint[];
  weight: number;
}

export const MAP_MODE_LABEL: Record<MapDisplayMode, string> = {
  pins: 'Pins',
  clusters: 'Clusters',
  heat: 'Heatmap',
  bubbles: 'Bubbles',
};

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

/** Escapes user text for popup HTML — Leaflet renders bindPopup via innerHTML,
 *  so record titles/addresses must never reach it raw. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/** Groups points whose PROJECTED positions fall in the same grid bucket of
 *  `radiusPx` — cheap O(n) clustering that tracks the current zoom. */
export function clusterPoints(
  points: readonly MapModePoint[],
  project: (lat: number, lng: number) => { x: number; y: number },
  radiusPx = 56,
): MapClusterGroup[] {
  const buckets = new Map<string, MapModePoint[]>();
  for (const point of points) {
    const p = project(point.lat, point.lng);
    const key = `${Math.floor(p.x / radiusPx)}:${Math.floor(p.y / radiusPx)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(point);
    else buckets.set(key, [point]);
  }
  return [...buckets.values()].map(items => centroidOf(items));
}

/** Merges points sharing (rounded) coordinates — one bubble per location,
 *  weights summed, so five records in Paris read as one honest circle. */
export function aggregateByLocation(points: readonly MapModePoint[]): MapClusterGroup[] {
  const buckets = new Map<string, MapModePoint[]>();
  // +0 folds -0 into 0 so "-0.000" and "0.000" share a bucket (Greenwich!).
  const coordKey = (n: number): string => (Number(n.toFixed(3)) + 0).toFixed(3);
  for (const point of points) {
    const key = `${coordKey(point.lat)}:${coordKey(point.lng)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(point);
    else buckets.set(key, [point]);
  }
  return [...buckets.values()].map(items => centroidOf(items));
}

function centroidOf(items: MapModePoint[]): MapClusterGroup {
  const n = items.length;
  return {
    lat: items.reduce((sum, i) => sum + i.lat, 0) / n,
    lng: items.reduce((sum, i) => sum + i.lng, 0) / n,
    items,
    weight: items.reduce((sum, i) => sum + i.weight, 0),
  };
}

/** √-scaled bubble radius: area ∝ weight, clamped to a legible range. */
export function bubbleRadius(weight: number, maxWeight: number, minPx = 10, maxPx = 36): number {
  if (maxWeight <= 0 || weight <= 0) return minPx;
  return Math.round(minPx + (maxPx - minPx) * Math.sqrt(Math.min(1, weight / maxWeight)));
}
