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

import React, { useRef, useState } from 'react';
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

/** The "N / total" readout when there are too many pages to list as buttons.
 *  Double-click the current-page number to type a page to jump to — `goTo`
 *  clamps to [1, pageCount], so an out-of-range entry snaps to the nearest end. */
function PageJumpField({ pager }: Readonly<{ pager: ViewPager<unknown> }>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const escaped = useRef(false);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n)) pager.goTo(n - 1);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className={cn('px-1.5 text-xs text-ink-secondary tabular-nums')}>
        <input type="text" inputMode="numeric" autoFocus aria-label="Go to page"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') { escaped.current = true; setEditing(false); }
          }}
          onBlur={() => { if (!escaped.current) commit(); escaped.current = false; }}
          className={cn('w-8 rounded bg-hover-surface text-center tabular-nums outline-none')} />
        {' / '}{pager.pageCount}
      </span>
    );
  }

  return (
    <span title="Double-click to jump to a page"
      onDoubleClick={() => { escaped.current = false; setDraft(String(pager.pageIndex + 1)); setEditing(true); }}
      className={cn('px-1.5 text-xs text-ink-secondary tabular-nums select-none cursor-text')}>
      {pager.pageIndex + 1} / {pager.pageCount}
    </span>
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
          : <PageJumpField pager={pager} />}
        <button type="button" onClick={pager.goNext} disabled={!pager.hasNext}
          aria-label="Next page" className={cn(navBtn)}>
          <ChevronRight className={cn('w-4 h-4')} />
        </button>
      </div>
    </nav>
  );
}
