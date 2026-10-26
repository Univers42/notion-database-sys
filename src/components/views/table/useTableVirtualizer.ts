/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useTableVirtualizer.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 15:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Row windowing for the ungrouped TableView so thousands of rows render at the
 * cost of the viewport (~viewport+overscan <tr>s, not the whole array). Keeps
 * the semantic <table>: the caller slices `[firstIndex..lastIndex]` and pads
 * with two spacer <tr>s (paddingTop/Bottom). Each windowed <tr> carries
 * `data-index` — tanstack's default measure attribute — so `measureRow` gives
 * exact heights; fixed AND wrap rows stay aligned with no estimate drift.
 */

import { useEffect, useState, type RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { observeCurrentElementOffset } from '../../../lib/virtualScroll';

const ROW_ESTIMATE_PX = 34;
// Overscan buys ~2 viewports of pre-rendered rows so a fast wheel/drag scroll
// doesn't outrun the render and flash blank rows on a thousand-row table.
const OVERSCAN_ROWS = 24;

interface TableVirtualizerArgs {
  count: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
}

export interface TableVirtual {
  paddingTop: number;
  paddingBottom: number;
  firstIndex: number;
  lastIndex: number;
  scrollToIndex: (index: number) => void;
  measureRow?: (el: HTMLTableRowElement | null) => void;
}

type OverflowOf = (el: HTMLElement) => string;

const overflowYOf: OverflowOf = (el) => getComputedStyle(el).overflowY;

/**
 * The element that scrolls the rows vertically: the table's own container when
 * its height is bounded (full-page database), else the nearest scrolling
 * ancestor. An inline database grows with its rows and the page scrolls, so
 * windowing against the container mounted every row — 110 rows, 8.4k nodes,
 * painted on every column-resize frame (live School tracker, 2026-10-26).
 */
export function resolveRowScroller(own: HTMLElement, overflowOf: OverflowOf = overflowYOf): HTMLElement {
  for (let el: HTMLElement | null = own; el; el = el.parentElement) {
    if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(overflowOf(el))) return el;
  }
  return own;
}

interface ScrollFrame {
  scroller: HTMLElement | null;
  /** Distance from the scroller's content top to the first body row. */
  margin: number;
}

/**
 * Where the rows scroll and where the body starts inside that scroller. The
 * `sticky top-0` <thead> is dead space the rows start below, so it is part of
 * the margin — without it the virtualizer's coordinates shift one header-height
 * from the DOM and the thumb drifts / snaps to the top near the bottom.
 * Caveat: re-measured when the table, its header or the scroller's content
 * resizes; content above an inline table that changes height without resizing
 * the scroller's first child leaves the margin stale until the next resize, so
 * the window is off by that delta (absorbed by the overscan up to ~800px).
 */
function useScrollFrame(scrollRef: RefObject<HTMLDivElement | null>, enabled: boolean): ScrollFrame {
  const [frame, setFrame] = useState<ScrollFrame>({ scroller: null, margin: 0 });
  useEffect(() => {
    const own = scrollRef.current;
    if (!enabled || !own || typeof ResizeObserver === 'undefined') return;
    const thead = own.querySelector('thead');
    const measure = () => {
      const scroller = resolveRowScroller(own);
      const offset = scroller === own
        ? 0
        : own.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const margin = Math.round(offset + (thead?.getBoundingClientRect().height ?? 0));
      setFrame(prev => (prev.scroller === scroller && Math.abs(prev.margin - margin) <= 1 ? prev : { scroller, margin }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(own);
    if (thead) ro.observe(thead);
    // Content above an inline table moves it inside the page: watch the page content.
    const content = frame.scroller && frame.scroller !== own ? frame.scroller.firstElementChild : null;
    if (content) ro.observe(content);
    return () => ro.disconnect();
  }, [scrollRef, enabled, frame.scroller]);
  return frame;
}

/** Windowed range + spacer paddings for the ungrouped table body. */
export function useTableVirtualizer({ count, scrollRef, enabled }: TableVirtualizerArgs): TableVirtual {
  const hasResizeObserver = typeof ResizeObserver !== 'undefined';
  const frame = useScrollFrame(scrollRef, enabled);
  const scrollMargin = frame.margin;
  const virtualizer = useVirtualizer<HTMLElement, HTMLTableRowElement>({
    count: enabled ? count : 0,
    getScrollElement: () => frame.scroller ?? scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: OVERSCAN_ROWS,
    scrollMargin,
    observeElementOffset: observeCurrentElementOffset,
  });

  const items = virtualizer.getVirtualItems();
  if (!enabled || items.length === 0) {
    return { paddingTop: 0, paddingBottom: 0, firstIndex: 0, lastIndex: -1, scrollToIndex: () => {} };
  }
  const total = virtualizer.getTotalSize();
  // `start`/`end` count from the scroller's content top; the spacer <tr>s sit
  // inside the body, so strip the margin or the body double-shifts down.
  return {
    paddingTop: Math.max(0, items[0].start - scrollMargin),
    paddingBottom: Math.max(0, total - (items[items.length - 1].end - scrollMargin)),
    firstIndex: items[0].index,
    lastIndex: items[items.length - 1].index,
    scrollToIndex: virtualizer.scrollToIndex,
    measureRow: hasResizeObserver ? virtualizer.measureElement : undefined,
  };
}
