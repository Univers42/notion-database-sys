// ─── VirtualCardList — one board column's cards, windowed ────────────────────
// A board set to show "All" mounted every card: 5085 cards were 222k DOM nodes
// and one drop between columns took 411 ms. Each column now windows its cards
// against the board's own scroller, which every column shares, so columns
// still scroll together.
// Caveat: unseen cards use an estimated height until they are measured, so the
// scrollbar length shifts a little while scrolling through a long column.

import React, { useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Page } from '../../../types/database';
import { cn } from '../../../utils/cn';

const CARD_GAP_PX = 8;
const OVERSCAN_CARDS = 6;
const CARD_ESTIMATE_PX: Readonly<Record<string, number>> = { small: 96, medium: 120, large: 140, xl: 160 };

interface VirtualCardListProps {
  pages: readonly Page[];
  /** The board's scroller. State, not a ref: a parent's ref attaches after
   *  its children's layout effects run, so the virtualizer would read null. */
  scrollElement: HTMLDivElement | null;
  cardSize: string;
  renderCard: (page: Page, index: number) => React.ReactNode;
}

/** Renders only the cards of `pages` near the board's viewport. */
export function VirtualCardList({ pages, scrollElement, cardSize, renderCard }: Readonly<VirtualCardListProps>) {
  const listRef = useRef<HTMLDivElement>(null);
  // Distance from the top of the scroller's content to this list (column
  // header + padding); the virtualizer works in the scroller's coordinates.
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !scrollElement) return;
    setScrollMargin(list.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top + scrollElement.scrollTop);
  }, [scrollElement]);

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: pages.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => CARD_ESTIMATE_PX[cardSize] ?? CARD_ESTIMATE_PX.medium,
    overscan: OVERSCAN_CARDS,
    gap: CARD_GAP_PX,
    scrollMargin,
    getItemKey: index => pages[index].id,
  });

  return (
    <div ref={listRef} className={cn('relative shrink-0')} style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map(item => (
        <div key={item.key} data-index={item.index} ref={virtualizer.measureElement}
          className={cn('absolute top-0 left-0 w-full')}
          style={{ transform: `translateY(${item.start - scrollMargin}px)` }}>
          {renderCard(pages[item.index], item.index)}
        </div>
      ))}
    </div>
  );
}
