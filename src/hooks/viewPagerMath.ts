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

/** Windowing math for a paged record list. */
export function computePageWindow(total: number, pageSize: number, pageIndex: number): PageWindow {
  const pageCount = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const clamped = Math.max(0, Math.min(pageIndex, pageCount - 1));
  const start = pageSize === Infinity ? 0 : clamped * pageSize;
  const end = pageSize === Infinity ? total : Math.min(start + pageSize, total);
  return {
    pageIndex: clamped, pageCount, start, end,
    hasPrev: clamped > 0,
    hasNext: clamped < pageCount - 1,
    enabled: pageSize !== Infinity && total > pageSize,
  };
}
