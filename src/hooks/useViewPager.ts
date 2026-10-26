/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useViewPager.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/09 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/09 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Shared view pagination (the "Limit" setting) ───────────────────────────
// One windowing primitive for every record-list view (table/list/gallery/feed).
// `loadLimit` is the page size; a finite value windows the ordered list into
// pages navigated by <ViewPaginationBar>. `loadLimit === 0` means "All" (no
// windowing); unset falls back to the historical default of 50. "Load more"
// and "Show all" widen the window in place for the session, over the limit.

import { useEffect, useMemo, useState } from 'react';
import { computeViewWindow, resolvePageSize } from './viewPagerMath';

export { DEFAULT_LOAD_LIMIT, resolvePageSize, computePageWindow } from './viewPagerMath';
export type { PageWindow } from './viewPagerMath';

export interface ViewPager<T> {
  /** The current page's slice of the list. */
  items: T[];
  pageIndex: number;   // 0-based
  pageCount: number;
  pageSize: number;    // finite, or Infinity for "All"
  total: number;
  start: number;       // 0-based index of the first shown item
  end: number;         // exclusive index of the last shown item
  hasPrev: boolean;
  hasNext: boolean;
  /** True when a finite limit actually hides rows — the pager UI shows only then. */
  enabled: boolean;
  /** Pages currently shown at once (1 = plain paging, Infinity = all). */
  span: number;
  goPrev: () => void;
  goNext: () => void;
  goTo: (index: number) => void;
  /** Append the next page below the shown rows. */
  loadMore: () => void;
  /** Show every row, overriding the limit until the view changes. */
  showAll: () => void;
  /** Back to one page at a time, keeping the first shown row. */
  showLess: () => void;
}

/**
 * Windows `all` into pages of `resolvePageSize(loadLimit)`. `resetKey` (the
 * view id) snaps back to page 1 and one page at a time when the view or the
 * limit changes; the window clamps when the list shrinks (delete/filter).
 */
export function useViewPager<T>(
  all: readonly T[],
  loadLimit: number | undefined,
  resetKey?: string | null,
): ViewPager<T> {
  const pageSize = resolvePageSize(loadLimit);
  const total = all.length;
  const [{ start, span }, setWindow] = useState({ start: 0, span: 1 });
  const win = computeViewWindow(total, pageSize, span, start);
  const size = pageSize * span;

  useEffect(() => { setWindow({ start: 0, span: 1 }); }, [resetKey, pageSize]);

  const items = useMemo(
    () => (win.start === 0 && win.end === all.length ? [...all] : all.slice(win.start, win.end)),
    [all, win.start, win.end],
  );

  return {
    items,
    pageIndex: win.pageIndex,
    pageCount: win.pageCount,
    pageSize,
    total,
    start: win.start,
    end: win.end,
    hasPrev: win.hasPrev,
    hasNext: win.hasNext,
    enabled: win.enabled,
    span,
    goPrev: () => setWindow(w => ({ ...w, start: Math.max(0, win.start - size) })),
    goNext: () => setWindow(w => ({ ...w, start: win.end < total ? win.start + size : w.start })),
    goTo: (index) => setWindow(w => (Number.isFinite(size) ? { ...w, start: Math.max(0, Math.min(win.pageCount - 1, index)) * size } : w)),
    loadMore: () => setWindow(w => ({ start: win.start, span: w.span + 1 })),
    showAll: () => setWindow({ start: 0, span: Infinity }),
    showLess: () => setWindow({ start: win.start, span: 1 }),
  };
}
