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
// windowing); unset falls back to the historical default of 50.

import { useEffect, useMemo, useState } from 'react';
import { computePageWindow, resolvePageSize } from './viewPagerMath';

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
  goPrev: () => void;
  goNext: () => void;
  goTo: (index: number) => void;
}

/**
 * Windows `all` into pages of `resolvePageSize(loadLimit)`. `resetKey` (the
 * view id) snaps back to page 1 when the view changes; the page also clamps
 * when the list shrinks (delete/filter) so it never strands past the end.
 */
export function useViewPager<T>(
  all: readonly T[],
  loadLimit: number | undefined,
  resetKey?: string | null,
): ViewPager<T> {
  const pageSize = resolvePageSize(loadLimit);
  const total = all.length;
  const [pageIndex, setPageIndex] = useState(0);
  const win = computePageWindow(total, pageSize, pageIndex);

  // Snap to the first page on a view switch or a page-size change.
  useEffect(() => { setPageIndex(0); }, [resetKey, pageSize]);
  // Never strand past the last page after the list shrinks.
  useEffect(() => {
    if (pageIndex > win.pageCount - 1) setPageIndex(win.pageCount - 1);
  }, [pageIndex, win.pageCount]);

  const items = useMemo(
    () => (pageSize === Infinity ? [...all] : all.slice(win.start, win.end)),
    [all, win.start, win.end, pageSize],
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
    goPrev: () => setPageIndex((i) => Math.max(0, i - 1)),
    goNext: () => setPageIndex((i) => Math.min(win.pageCount - 1, i + 1)),
    goTo: (index) => setPageIndex(() => Math.max(0, Math.min(win.pageCount - 1, index))),
  };
}
