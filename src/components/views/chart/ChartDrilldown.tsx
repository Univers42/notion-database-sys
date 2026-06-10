/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartDrilldown.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useState } from 'react';
import { X, FileText } from 'lucide-react';
import type { ChartResult } from '../../../lib/chart/chartTypes';
import { VALUE_SERIES_KEY } from '../../../lib/chart/chartTypes';
import { cn } from '../../../utils/cn';

/** A drilldown target: one (category × series) cell of the chart. */
export interface DrilldownTarget {
  categoryIndex: number;
  seriesKey: string;
}

/** Minimal page row shape the drilldown needs. */
export interface DrilldownPage {
  id: string;
  title: string;
  icon?: string;
  /** False for server rows not loaded in the store (rendered read-only). */
  openable?: boolean;
}

const MAX_ROWS = 50;

/**
 * Notion-style drilldown: clicking a bar/slice opens the underlying rows
 * ("N items where X = label"); clicking a row opens the page. Server-truth
 * charts pass `fetchRows` to list rows straight from the live mount.
 */
export function ChartDrilldown({ result, target, resolvePages, fetchRows, itemCount, onOpenPage, onClose }: Readonly<{
  result: ChartResult;
  target: DrilldownTarget;
  resolvePages: (ids: string[]) => DrilldownPage[];
  fetchRows?: (target: DrilldownTarget) => Promise<DrilldownPage[]>;
  /** Overrides the header count (server-truth count aggregates). */
  itemCount?: number;
  onOpenPage: (id: string) => void;
  onClose: () => void;
}>) {
  const [fetched, setFetched] = useState<DrilldownPage[] | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (!fetchRows) return;
    let alive = true;
    setFetched(null);
    fetchRows(target)
      .then(rows => { if (alive) setFetched(rows); })
      .catch(() => { if (alive) setFetched([]); });
    return () => { alive = false; };
  }, [fetchRows, target]);

  const category = result.categories[target.categoryIndex];
  if (!category) return null;
  const ids = category.pageIds[target.seriesKey] ?? [];
  const series = result.series.find(s => s.key === target.seriesKey);
  const seriesPart = series && target.seriesKey !== VALUE_SERIES_KEY ? ` · ${series.label}` : '';
  const loading = !!fetchRows && fetched === null;
  const pages = fetchRows ? (fetched ?? []) : resolvePages(ids.slice(0, MAX_ROWS));
  const count = itemCount ?? (fetchRows ? pages.length : ids.length);

  return (
    <div className={cn("absolute inset-0 z-20 flex items-center justify-center")}>
      <button aria-label="Close drilldown" onClick={onClose} tabIndex={-1}
        className={cn("absolute inset-0 bg-overlay-scrim/20 cursor-default")} />
      <div className={cn("relative bg-surface-primary border border-line rounded-xl shadow-xl w-[340px] max-h-[80%] flex flex-col")}>
        <div className={cn("flex items-center gap-2 px-4 py-3 border-b border-line")}>
          <div className={cn("flex-1 min-w-0")}>
            <div className={cn("text-sm font-semibold text-ink truncate")}>
              {count.toLocaleString()} item{count === 1 ? '' : 's'}
            </div>
            <div className={cn("text-xs text-ink-muted truncate")}>{category.label}{seriesPart}</div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className={cn("p-1 rounded-md hover:bg-hover-surface text-ink-muted shrink-0")}>
            <X className={cn("w-4 h-4")} />
          </button>
        </div>
        <div className={cn("flex-1 overflow-auto py-1")}>
          {loading && (
            <div className={cn("px-4 py-6 text-center text-xs text-ink-muted animate-pulse")}>Loading rows…</div>
          )}
          {!loading && pages.length === 0 && (
            <div className={cn("px-4 py-6 text-center text-xs text-ink-muted")}>
              No pages to show for this group.
            </div>
          )}
          {pages.map(page => (
            <button key={page.id} disabled={page.openable === false}
              onClick={() => { if (page.openable !== false) { onOpenPage(page.id); onClose(); } }}
              className={cn(`w-full flex items-center gap-2 px-4 py-1.5 text-sm text-left text-ink-body transition-colors ${
                page.openable === false ? 'cursor-default opacity-80' : 'hover:bg-hover-surface-soft2'
              }`)}>
              <span className={cn("w-4 h-4 flex items-center justify-center shrink-0 text-ink-muted")}>
                {page.icon || <FileText className={cn("w-3.5 h-3.5")} />}
              </span>
              <span className={cn("truncate")}>{page.title || 'Untitled'}</span>
            </button>
          ))}
          {count > pages.length && pages.length > 0 && (
            <div className={cn("px-4 py-2 text-xs text-ink-muted")}>
              Showing first {pages.length} of {count.toLocaleString()} items.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
