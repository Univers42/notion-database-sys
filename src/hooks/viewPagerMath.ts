/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   viewPagerMath.ts                                    :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/09 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/09 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Pure view-pagination math (no React) — unit-tested in isolation ────────

export const DEFAULT_LOAD_LIMIT = 50;

/** `0` = All (Infinity), unset = default 50, else the chosen size. */
export function resolvePageSize(loadLimit: number | undefined): number {
  if (loadLimit === 0) return Infinity;
  return loadLimit && loadLimit > 0 ? loadLimit : DEFAULT_LOAD_LIMIT;
}

export interface PageWindow {
  pageIndex: number;   // clamped into [0, pageCount)
  pageCount: number;
  start: number;       // 0-based, inclusive
  end: number;         // exclusive
  hasPrev: boolean;
  hasNext: boolean;
  enabled: boolean;    // a finite limit actually hides rows
}

/**
 * Window of `span` pages of `pageSize` rows starting at row `start`. "Load
 * more" grows the span so rows append in place; page navigation then steps by
 * the whole visible window, so the page count shrinks as more rows are shown.
 * `start` clamps onto the last window when the list shrinks.
 */
export function computeViewWindow(total: number, pageSize: number, span: number, start: number): PageWindow {
  const size = pageSize * Math.max(1, span);
  if (size === Infinity) {
    // Still enabled under a finite limit, so the bar can offer "Show less".
    return { pageIndex: 0, pageCount: 1, start: 0, end: total, hasPrev: false, hasNext: false, enabled: total > pageSize };
  }
  const pageCount = Math.max(1, Math.ceil(total / size));
  const first = start >= total ? (pageCount - 1) * size : Math.max(0, start);
  const end = Math.min(first + size, total);
  return {
    // A window grown from a middle page is not page-aligned; it reads as the
    // page holding its last row, so "next" is never highlighted as current.
    pageIndex: Math.min(pageCount - 1, Math.floor(Math.max(0, end - 1) / size)),
    pageCount, start: first, end,
    hasPrev: first > 0,
    hasNext: end < total,
    enabled: total > pageSize,
  };
}

/** Windowing math for a paged record list (one page at a time). */
export function computePageWindow(total: number, pageSize: number, pageIndex: number): PageWindow {
  if (pageSize === Infinity) return computeViewWindow(total, pageSize, 1, 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const clamped = Math.max(0, Math.min(pageIndex, pageCount - 1));
  return computeViewWindow(total, pageSize, 1, clamped * pageSize);
}
