/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardColumnStack.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardColumnStack — one row column: a vertical stack of cards ───────
// A column fills the row height unless DETACHED (its own height: a single
// card's override or a stack's `height`), members split it by shares with a
// draggable divider between them (DOM-only during the drag, one commit on
// release). The pill on the bottom border detaches/re-aligns ANY column —
// single cards and whole stacks alike — so nothing is ever locked to the
// group bar.

import React, { useRef } from 'react';
import { DashboardSplitter } from './DashboardSplitter';
import { GroupResizeZone, CardResizeZone, EdgeResizeZone } from './DashboardCellHandles';
import { MIN_STACK_SHARE } from './model/dashboardLayout';
import type { DashboardStack } from '../../../../types/database';
import { cn } from '../../../../utils/cn';

const GAP_PX = 6;

interface DragCallbacks {
  onStart: () => void;
  onLive: (deltaPx: number) => void;
  onEnd: () => void;
}

/** Renders one column of a dashboard row. */
export function DashboardColumnStack({
  colIndex, stack, shares, editMode, renderWidget,
  detachedHeight, hideCls, cellCls,
  groupHot, onGroupHotChange, groupDrag, pillDrag, edgeDrag,
  onCommitShares,
}: Readonly<{
  colIndex: number;
  stack: DashboardStack;
  /** Effective member shares (sum 1) — pass stackShares(stack). */
  shares: number[];
  editMode: boolean;
  renderWidget: (widgetId: string) => React.ReactNode;
  /** Own height (px) when this is a detached single-card column. */
  detachedHeight?: number;
  hideCls: string;
  cellCls: string;
  groupHot: boolean;
  onGroupHotChange: (hot: boolean) => void;
  /** Row-height (group) drag, owned by the row shell. */
  groupDrag: DragCallbacks;
  /** Detach/re-align drag for single-card columns; null → no pill. */
  pillDrag: DragCallbacks | null;
  /** Right-edge width drag — the row shell passes it to the LAST column. */
  edgeDrag?: DragCallbacks | null;
  onCommitShares: (dividerIndex: number, deltaFraction: number) => void;
}>) {
  const colRef = useRef<HTMLDivElement>(null);
  const inner = useRef<{ cards: HTMLElement[]; usable: number; shares: number[]; delta: number }>(
    { cards: [], usable: 0, shares: [], delta: 0 },
  );
  const count = stack.widgetIds.length;
  const detached = detachedHeight != null;

  const setDragging = (on: boolean) => {
    const grid = colRef.current?.closest<HTMLElement>('.odb-row-grid');
    if (!grid) return;
    if (on) grid.dataset.dragging = 'true';
    else delete grid.dataset.dragging;
  };

  const startInner = () => {
    const col = colRef.current;
    if (!col) return;
    setDragging(true);
    inner.current = {
      cards: [...col.querySelectorAll<HTMLElement>('[data-dash-widget]')],
      usable: col.clientHeight - GAP_PX * (count - 1),
      shares: [...shares],
      delta: 0,
    };
  };
  const liveInner = (dividerIndex: number) => (deltaPx: number) => {
    const drag = inner.current;
    if (drag.usable <= 0 || !drag.cards[dividerIndex + 1]) return;
    const pair = drag.shares[dividerIndex] + drag.shares[dividerIndex + 1];
    const top = Math.max(
      MIN_STACK_SHARE,
      Math.min(pair - MIN_STACK_SHARE, drag.shares[dividerIndex] + deltaPx / drag.usable),
    );
    drag.delta = top - drag.shares[dividerIndex];
    drag.cards[dividerIndex].style.height = `${top * drag.usable}px`;
    drag.cards[dividerIndex + 1].style.height = `${(pair - top) * drag.usable}px`;
  };
  const endInner = (dividerIndex: number) => {
    setDragging(false);
    onCommitShares(dividerIndex, inner.current.delta);
  };

  const memberHeight = (share: number): string =>
    count === 1 ? '100%' : `calc((100% - ${GAP_PX * (count - 1)}px) * ${share})`;

  return (
    <div ref={colRef} data-dash-col={colIndex}
      className={cn("relative min-w-0 min-h-0 flex flex-col h-[var(--dash-cell-h,var(--dash-h))]", cellCls)}
      style={detached ? { '--dash-cell-h': `${detachedHeight}px` } as React.CSSProperties : undefined}>
      {stack.widgetIds.map((widgetId, j) => (
        <React.Fragment key={widgetId}>
          {j > 0 && (editMode
            ? <DashboardSplitter direction="row" className={cn("shrink-0", hideCls)}
              onResizeStart={startInner}
              onResize={liveInner(j - 1)}
              onResizeEnd={() => endInner(j - 1)} />
            : <div className={cn("shrink-0")} style={{ height: GAP_PX }} />)}
          <div data-dash-widget={widgetId}
            className={cn("relative min-h-0 flex flex-col")}
            style={{ height: memberHeight(shares[j] ?? 1 / count) }}>
            <div className={cn("odb-cell-body flex-1 min-h-0 flex flex-col")}>
              {renderWidget(widgetId)}
            </div>
          </div>
        </React.Fragment>
      ))}
      {editMode && !detached && (
        <GroupResizeZone hot={groupHot} onHotChange={onGroupHotChange}
          onStart={groupDrag.onStart} onLive={groupDrag.onLive} onEnd={groupDrag.onEnd}
          className={hideCls} />
      )}
      {editMode && pillDrag && (
        <CardResizeZone detached={detached}
          onStart={pillDrag.onStart} onLive={pillDrag.onLive} onEnd={pillDrag.onEnd}
          className={hideCls} />
      )}
      {editMode && edgeDrag && (
        <EdgeResizeZone
          onStart={edgeDrag.onStart} onLive={edgeDrag.onLive} onEnd={edgeDrag.onEnd}
          className={hideCls} />
      )}
    </div>
  );
}
