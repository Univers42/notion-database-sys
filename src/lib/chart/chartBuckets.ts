/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartBuckets.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── chartBuckets — date bucketing for date x-axes ──────────────────────────

import { startOfWeek, format } from 'date-fns';
import type { ChartPageLike, DateBucketSetting, DateGranularity } from './chartTypes';

const DAY_MS = 86_400_000;

/** Parses a date-ish property value to epoch ms, or null when unparseable. */
export function toMs(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const d = new Date(raw as string | number | Date);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Picks a granularity from the data span (Notion 'auto' behaviour):
 * ≤31 days → day, ≤26 weeks → week, ≤24 months → month,
 * ≤3 years → quarter, else year.
 */
export function autoGranularity(minMs: number, maxMs: number): DateGranularity {
  const days = (maxMs - minMs) / DAY_MS;
  if (days <= 31) return 'day';
  if (days <= 26 * 7) return 'week';
  if (days <= 731) return 'month';
  if (days <= 3 * 366) return 'quarter';
  return 'year';
}

/**
 * Stable, chronologically sortable bucket key for a timestamp.
 * Keys compare correctly with plain string comparison per granularity.
 */
export function bucketDateKey(ms: number, granularity: DateGranularity): string {
  const d = new Date(ms);
  switch (granularity) {
    case 'day': return format(d, 'yyyy-MM-dd');
    case 'week': return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month': return format(d, 'yyyy-MM');
    case 'quarter': return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    case 'year': return format(d, 'yyyy');
  }
}

/** Human label for a bucket key produced by {@link bucketDateKey}. */
export function bucketLabel(key: string, granularity: DateGranularity): string {
  switch (granularity) {
    case 'day': return format(new Date(`${key}T00:00:00`), 'MMM d, yyyy');
    case 'week': return format(new Date(`${key}T00:00:00`), "'W/o' MMM d, yyyy");
    case 'month': return format(new Date(`${key}-01T00:00:00`), 'MMM yyyy');
    case 'quarter': return `Q${key.slice(-1)} ${key.slice(0, 4)}`;
    case 'year': return key;
  }
}

/**
 * Resolves the effective granularity for a chart: explicit setting wins,
 * 'auto' (or unset) scans the pages' min/max values.
 */
export function resolveGranularity(
  pages: readonly ChartPageLike[],
  propId: string,
  setting: DateBucketSetting | undefined,
): DateGranularity {
  if (setting && setting !== 'auto') return setting;
  let min = Infinity;
  let max = -Infinity;
  for (const page of pages) {
    const ms = toMs(page.properties[propId]);
    if (ms === null) continue;
    if (ms < min) min = ms;
    if (ms > max) max = ms;
  }
  if (min > max) return 'month';
  return autoGranularity(min, max);
}
