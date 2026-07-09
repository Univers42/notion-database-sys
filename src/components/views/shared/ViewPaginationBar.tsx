/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ViewPaginationBar.tsx                               :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/09 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/09 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Record page navigator (shown above a view when a Limit is set) ─────────
// Renders "26–50 of 200" + prev/next; numeric page buttons when the count is
// small enough to fit. Hidden entirely when the limit doesn't hide any rows.

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ViewPager } from '../../../hooks/useViewPager';
import { cn } from '../../../utils/cn';

const navBtn = 'inline-flex items-center justify-center min-h-[28px] min-w-[28px] rounded-md text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface disabled:opacity-40 disabled:pointer-events-none transition-colors';

/** Numeric page buttons — only when few enough to read at a glance. */
function PageNumbers({ pager }: Readonly<{ pager: ViewPager<unknown> }>) {
  return (
    <>
      {Array.from({ length: pager.pageCount }, (_, i) => (
        <button key={i} type="button" onClick={() => pager.goTo(i)}
          aria-label={`Page ${i + 1}`} aria-current={i === pager.pageIndex ? 'page' : undefined}
          className={cn(`${navBtn} px-2 text-xs tabular-nums ${
            i === pager.pageIndex ? 'bg-accent-soft text-accent-text font-medium' : ''}`)}>
          {i + 1}
        </button>
      ))}
    </>
  );
}

/** Pagination controls for a windowed record list. Renders nothing unless the
 *  active limit actually hides rows. */
export function ViewPaginationBar({ pager }: Readonly<{ pager: ViewPager<unknown> }>) {
  if (!pager.enabled) return null;
  return (
    <nav aria-label="Record pages"
      className={cn('flex items-center justify-between gap-2 px-3 py-1.5 border-b border-line bg-surface-primary shrink-0')}>
      <span className={cn('text-xs text-ink-muted tabular-nums select-none')}>
        {pager.start + 1}&ndash;{pager.end} <span className={cn('text-ink-disabled')}>of</span> {pager.total}
      </span>
      <div className={cn('flex items-center gap-0.5')}>
        <button type="button" onClick={pager.goPrev} disabled={!pager.hasPrev}
          aria-label="Previous page" className={cn(navBtn)}>
          <ChevronLeft className={cn('w-4 h-4')} />
        </button>
        {pager.pageCount <= 7
          ? <PageNumbers pager={pager} />
          : <span className={cn('px-1.5 text-xs text-ink-secondary tabular-nums select-none')}>
              {pager.pageIndex + 1} / {pager.pageCount}
            </span>}
        <button type="button" onClick={pager.goNext} disabled={!pager.hasNext}
          aria-label="Next page" className={cn(navBtn)}>
          <ChevronRight className={cn('w-4 h-4')} />
        </button>
      </div>
    </nav>
  );
}
