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

import type { RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const ROW_ESTIMATE_PX = 34;
const OVERSCAN_ROWS = 12;

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

/** Windowed range + spacer paddings for the ungrouped table body. */
export function useTableVirtualizer({ count, scrollRef, enabled }: TableVirtualizerArgs): TableVirtual {
  const hasResizeObserver = typeof ResizeObserver !== 'undefined';
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: enabled ? count : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: OVERSCAN_ROWS,
  });

  const items = virtualizer.getVirtualItems();
  if (!enabled || items.length === 0) {
    return { paddingTop: 0, paddingBottom: 0, firstIndex: 0, lastIndex: -1, scrollToIndex: () => {} };
  }
  const total = virtualizer.getTotalSize();
  return {
    paddingTop: items[0].start,
    paddingBottom: total - items[items.length - 1].end,
    firstIndex: items[0].index,
    lastIndex: items[items.length - 1].index,
    scrollToIndex: virtualizer.scrollToIndex,
    measureRow: hasResizeObserver ? virtualizer.measureElement : undefined,
  };
}
