/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useTableVirtualizer.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Row windowing for the ungrouped TableView so thousands of rows render at the
 * cost of the viewport (~viewport+overscan <tr>s, not the whole array). Keeps
 * the semantic <table>: the caller slices `[firstIndex..lastIndex]` and pads
 * with two spacer <tr>s (paddingTop/Bottom). Each windowed <tr> carries
 * `data-index` (== the global index in the ungrouped path) — tanstack's default
 * measure attribute — so `measureRow` gives exact heights; fixed AND wrap rows stay aligned
 * with no estimate drift. Disabled (`enabled:false`) for the grouped path,
 * which keeps its own non-windowed layout; the hook still runs (count 0) so
 * hook order stays stable.
 */

import { useEffect, useState, type RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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

/**
 * Measure the `sticky top-0` <thead> that sits inside the scroll element. Its
 * height is dead space the windowed <tbody> rows start below, so the virtualizer
 * must treat it as `scrollMargin` — otherwise its 0-based coordinate space is
 * shifted one header-height from the real DOM and the thumb drifts / snaps to
 * the top near the bottom (it overshoots the end by that offset).
 */
function useHeaderOffset(scrollRef: RefObject<HTMLDivElement | null>, enabled: boolean): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!enabled || !scrollEl || typeof ResizeObserver === 'undefined') return;
    const thead = scrollEl.querySelector('thead');
    if (!thead) return;
    const measure = () => setOffset(thead.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(thead);
    return () => ro.disconnect();
  }, [scrollRef, enabled]);
  return offset;
}

/** Windowed range + spacer paddings for the ungrouped table body. */
export function useTableVirtualizer({ count, scrollRef, enabled }: TableVirtualizerArgs): TableVirtual {
  const hasResizeObserver = typeof ResizeObserver !== 'undefined';
  const scrollMargin = useHeaderOffset(scrollRef, enabled);
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: enabled ? count : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: OVERSCAN_ROWS,
    scrollMargin,
  });

  const items = virtualizer.getVirtualItems();
  if (!enabled || items.length === 0) {
    return { paddingTop: 0, paddingBottom: 0, firstIndex: 0, lastIndex: -1, scrollToIndex: () => {} };
  }
  const total = virtualizer.getTotalSize();
  // `start`/`end` are offset by scrollMargin; the real <thead> already provides
  // it, so strip it back out of the spacer <tr>s or the body double-shifts down.
  return {
    paddingTop: Math.max(0, items[0].start - scrollMargin),
    paddingBottom: Math.max(0, total - (items[items.length - 1].end - scrollMargin)),
    firstIndex: items[0].index,
    lastIndex: items[items.length - 1].index,
    scrollToIndex: virtualizer.scrollToIndex,
    measureRow: hasResizeObserver ? virtualizer.measureElement : undefined,
  };
}
