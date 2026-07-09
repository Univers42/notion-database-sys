/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardRowShell.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardRowShell — one widget row: width/height drag at 60fps ─────────
// During a drag, deltas write straight to inline CSS vars (--dash-cols /
// --dash-h / per-column --dash-cell-h) — the store is only touched once, on
// pointer-up. This is the workspace-grid splitter rule.
//
// Columns are STACKS (DashboardColumnStack): a column can hold up to 3 cards
// splitting the row height by shares. Vertical resize keeps TWO zones per
// column: just BELOW the border = the GROUP bar (aligned columns resize
// together); ON a single card's border = that card only (detach), snapping
// back into alignment within SNAP_ALIGN_PX of the row line.

import React, { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { DashboardSplitter } from './DashboardSplitter';
import { DashboardColumnStack } from './DashboardColumnStack';
import {
  MIN_WIDTH_FRACTION, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT,
  rowStacks, stackShares,
} from './model/dashboardLayout';
import type { DashboardRow } from '../../../../types/database';
import { cn } from '../../../../utils/cn';

const SPLITTER_PX = 6;
const SNAP_ALIGN_PX = 8;
// Mirrors resizeLastWidth's snap so the live drag never lies about the commit.
const SNAP_FULL_FRACTION = 0.04;

// Container width below which the row stacks into one column. Full literals —
// Tailwind only compiles classes it can see statically. '2xl' (672px) is the
// always-on baseline; the "Responsive layout" setting picks larger thresholds
// for rows with more widgets so nothing renders too thin to read.
const STACK_CLASSES = {
  '2xl': {
    hide: '@max-2xl:hidden',
    grid: '@max-2xl:[grid-template-columns:minmax(0,1fr)] @max-2xl:gap-1.5',
    cell: '@max-2xl:h-[min(var(--dash-cell-h,var(--dash-h)),420px)]',
  },
  '3xl': {
    hide: '@max-3xl:hidden',
    grid: '@max-3xl:[grid-template-columns:minmax(0,1fr)] @max-3xl:gap-1.5',
    cell: '@max-3xl:h-[min(var(--dash-cell-h,var(--dash-h)),420px)]',
  },
  '4xl': {
    hide: '@max-4xl:hidden',
    grid: '@max-4xl:[grid-template-columns:minmax(0,1fr)] @max-4xl:gap-1.5',
    cell: '@max-4xl:h-[min(var(--dash-cell-h,var(--dash-h)),420px)]',
  },
  '5xl': {
    hide: '@max-5xl:hidden',
    grid: '@max-5xl:[grid-template-columns:minmax(0,1fr)] @max-5xl:gap-1.5',
    cell: '@max-5xl:h-[min(var(--dash-cell-h,var(--dash-h)),420px)]',
  },
} as const;

/** Container-query breakpoint under which a dashboard row stacks. */
export type StackVariant = keyof typeof STACK_CLASSES;

function columnsFor(widths: number[]): string {
  // fr units share the leftover space after the fixed splitter columns,
  // so fractions stay exact no matter how many dividers a row has. Widths
  // summing under 1 leave trailing SLACK — a phantom fr track of empty,
  // droppable space (the horizontal twin of the hole below a shrunk card).
  const cols = widths
    .map(w => `minmax(0, ${Math.max(1, Math.round(w * 1000))}fr)`)
    .join(` ${SPLITTER_PX}px `);
  const slack = 1 - widths.reduce((total, w) => total + w, 0);
  return slack > 0.001 ? `${cols} ${SPLITTER_PX}px ${Math.round(slack * 1000)}fr` : cols;
}

/** Renders a row's columns in a CSS grid with live-draggable dividers. */
export function DashboardRowShell({
  row, editMode, renderWidget, cellHeights = {},
  onCommitWidths, onCommitHeight, onCommitCellHeight, onCommitStackHeight,
  onCommitStackShares, onCommitLastWidth,
  onAddToRow, addPicker, stack = '2xl',
}: Readonly<{
  row: DashboardRow;
  editMode: boolean;
  renderWidget: (widgetId: string) => React.ReactNode;
  /** Per-widget height overrides (px) — cards detached from the row height. */
  cellHeights?: Record<string, number>;
  onCommitWidths: (dividerIndex: number, deltaFraction: number) => void;
  onCommitHeight: (height: number) => void;
  /** Commit one card's own height; null re-aligns it to the row. */
  onCommitCellHeight?: (widgetId: string, height: number | null) => void;
  /** Commit a STACKED column's own height; null re-aligns it to the row. */
  onCommitStackHeight?: (colIndex: number, height: number | null) => void;
  /** Commit an inner stack divider move (fraction of the column height). */
  onCommitStackShares?: (colIndex: number, dividerIndex: number, deltaFraction: number) => void;
  /** Commit a right-edge width drag (fraction of the row width). */
  onCommitLastWidth?: (deltaFraction: number) => void;
  /** Edit-mode `+` at the row's right edge (Notion: add widgets ON rows). */
  onAddToRow?: () => void;
  /** The widget picker anchored to this row's `+`, when open. */
  addPicker?: React.ReactNode;
  /** Stack-below-this-container-width breakpoint (see STACK_CLASSES). */
  stack?: StackVariant;
}>) {
  const stackCls = STACK_CLASSES[stack];
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ widths: number[]; delta: number; height: number }>({ widths: [], delta: 0, height: row.height });
  const cellDrag = useRef<{ el: HTMLElement | null; start: number; next: number }>({ el: null, start: 0, next: 0 });
  // Aligned columns' segments light together: one long bar across the group.
  const [groupHot, setGroupHot] = useState(false);
  const stacks = rowStacks(row);

  // The glide transition (odb-row-grid) must not fight a live drag: the row
  // tracks the pointer 1:1 while data-dragging is set, then the commit's
  // normalization glides when it clears.
  const setDragging = (on: boolean) => {
    const el = rowRef.current;
    if (!el) return;
    if (on) el.dataset.dragging = 'true';
    else delete el.dataset.dragging;
  };

  const startWidths = () => { setDragging(true); drag.current = { widths: [...row.widths], delta: 0, height: row.height }; };
  const liveWidths = (dividerIndex: number) => (deltaFraction: number) => {
    const el = rowRef.current;
    if (!el) return;
    const widths = [...drag.current.widths];
    const pair = widths[dividerIndex] + widths[dividerIndex + 1];
    const left = Math.max(MIN_WIDTH_FRACTION, Math.min(pair - MIN_WIDTH_FRACTION, widths[dividerIndex] + deltaFraction));
    widths[dividerIndex] = left;
    widths[dividerIndex + 1] = pair - left;
    drag.current.delta = left - drag.current.widths[dividerIndex];
    el.style.setProperty('--dash-cols', columnsFor(widths)); // DOM-only, no store write
  };

  const startHeight = () => { setDragging(true); drag.current = { widths: [...row.widths], delta: 0, height: row.height }; };
  const liveHeight = (deltaPx: number) => {
    const el = rowRef.current;
    if (!el) return;
    // Clamp live exactly like the commit does, so pointer-up never snaps back.
    const next = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, drag.current.height + deltaPx));
    drag.current.delta = next - drag.current.height;
    el.style.setProperty('--dash-h', `${next}px`);
  };
  const endHeight = () => { setDragging(false); onCommitHeight(drag.current.height + drag.current.delta); };

  // Right-edge width drag on the LAST column: live math mirrors
  // resizeLastWidth (clamp + snap-to-full) so pointer-up never snaps back.
  const startEdge = () => {
    setDragging(true);
    drag.current = { widths: [...row.widths], delta: 0, height: row.height };
  };
  const liveEdge = (deltaPx: number) => {
    const el = rowRef.current;
    if (!el || el.clientWidth === 0) return;
    const widths = [...drag.current.widths];
    const last = widths.length - 1;
    const others = widths.reduce((total, w) => total + w, 0) - widths[last];
    const max = 1 - others;
    const next = Math.max(MIN_WIDTH_FRACTION, Math.min(max, widths[last] + deltaPx / el.clientWidth));
    widths[last] = max - next <= SNAP_FULL_FRACTION ? max : next;
    drag.current.delta = widths[last] - drag.current.widths[last];
    el.style.setProperty('--dash-cols', columnsFor(widths));
  };
  const endEdge = () => { setDragging(false); onCommitLastWidth?.(drag.current.delta); };

  const startCell = (colIndex: number, startHeight: number) => {
    setDragging(true);
    cellDrag.current = {
      el: rowRef.current?.querySelector<HTMLElement>(`[data-dash-col="${colIndex}"]`) ?? null,
      start: startHeight, next: startHeight,
    };
  };
  const liveCell = (deltaPx: number) => {
    const cell = cellDrag.current;
    if (!cell.el) return;
    cell.next = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, cell.start + deltaPx));
    cell.el.style.setProperty('--dash-cell-h', `${cell.next}px`);
  };
  const endCell = (commit: (height: number | null) => void) => {
    setDragging(false);
    const cell = cellDrag.current;
    const aligned = Math.abs(cell.next - row.height) <= SNAP_ALIGN_PX;
    // React never owns this var on aligned columns — clear the live write too.
    if (aligned) cell.el?.style.removeProperty('--dash-cell-h');
    commit(aligned ? null : Math.round(cell.next));
  };

  // Narrow containers (mobile, slim workspace panes) stack the row into one
  // column: each column keeps its height (capped), handles disappear — the
  // layout model is untouched, wide containers restore the exact grid.
  return (
    <div className={cn("group/row relative flex flex-col")}>
      {onAddToRow && (
        <button type="button" aria-label="Add widget to this row" title="Add widget to this row"
          onClick={onAddToRow}
          className={cn(`absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 h-8 w-5 flex items-center justify-center
            rounded-md text-ink-muted opacity-0 group-hover/row:opacity-100 hover:bg-hover-surface hover:text-ink
            transition-opacity`, stackCls.hide)}>
          <Plus className={cn("w-3.5 h-3.5")} />
        </button>
      )}
      {addPicker}
      <div ref={rowRef} data-dash-row={row.id}
        className={cn(
          "odb-row-grid grid items-start [grid-template-columns:var(--dash-cols)]",
          stackCls.grid,
        )}
        style={{ '--dash-cols': columnsFor(row.widths), '--dash-h': `${row.height}px` } as React.CSSProperties}>
        {stacks.map((column, i) => {
          const soleId = column.widgetIds.length === 1 ? column.widgetIds[0] : null;
          const detachedHeight = soleId != null ? cellHeights[soleId] : column.height;
          // Single cards commit their widget override; stacks their column height.
          const pillCommit = soleId != null
            ? (onCommitCellHeight ? (h: number | null) => onCommitCellHeight(soleId, h) : null)
            : (onCommitStackHeight ? (h: number | null) => onCommitStackHeight(i, h) : null);
          return (
            <React.Fragment key={column.widgetIds[0] ?? i}>
              {i > 0 && (editMode
                ? <DashboardSplitter direction="col" className={stackCls.hide}
                  onResizeStart={startWidths}
                  onResize={liveWidths(i - 1)}
                  onResizeEnd={() => { setDragging(false); onCommitWidths(i - 1, drag.current.delta); }} />
                : <div className={cn(stackCls.hide)} style={{ width: SPLITTER_PX }} />)}
              <DashboardColumnStack
                colIndex={i} stack={column} shares={stackShares(column)}
                editMode={editMode} renderWidget={renderWidget}
                detachedHeight={detachedHeight}
                hideCls={stackCls.hide} cellCls={stackCls.cell}
                groupHot={groupHot} onGroupHotChange={setGroupHot}
                groupDrag={{ onStart: startHeight, onLive: liveHeight, onEnd: endHeight }}
                pillDrag={pillCommit
                  ? {
                    onStart: () => startCell(i, detachedHeight ?? row.height),
                    onLive: liveCell,
                    onEnd: () => endCell(pillCommit),
                  }
                  : null}
                edgeDrag={i === stacks.length - 1 && onCommitLastWidth
                  ? { onStart: startEdge, onLive: liveEdge, onEnd: endEdge }
                  : null}
                onCommitShares={(dividerIndex, deltaFraction) =>
                  onCommitStackShares?.(i, dividerIndex, deltaFraction)} />
            </React.Fragment>
          );
        })}
      </div>
      {/* Row gap: tall enough that the group zone lives fully inside it. */}
      <div className={cn("h-3")} />
    </div>
  );
}
