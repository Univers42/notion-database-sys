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
// During a drag, deltas write straight to the row element's inline style
// (gridTemplateColumns / height) — the store is only touched once, on
// pointer-up. This is the workspace-grid splitter rule.

import React, { useRef } from 'react';
import { DashboardSplitter } from './DashboardSplitter';
import { MIN_WIDTH_FRACTION } from './model/dashboardLayout';
import type { DashboardRow } from '../../../../types/database';
import { cn } from '../../../../utils/cn';

const SPLITTER_PX = 6;

function columnsFor(widths: number[]): string {
  // fr units share the leftover space after the fixed splitter columns,
  // so fractions stay exact no matter how many dividers a row has.
  return widths
    .map(w => `minmax(0, ${Math.max(1, Math.round(w * 1000))}fr)`)
    .join(` ${SPLITTER_PX}px `);
}

/** Renders a row's widgets in a CSS grid with live-draggable dividers. */
export function DashboardRowShell({ row, editMode, renderWidget, onCommitWidths, onCommitHeight }: Readonly<{
  row: DashboardRow;
  editMode: boolean;
  renderWidget: (widgetId: string) => React.ReactNode;
  onCommitWidths: (dividerIndex: number, deltaFraction: number) => void;
  onCommitHeight: (height: number) => void;
}>) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ widths: number[]; delta: number; height: number }>({ widths: [], delta: 0, height: row.height });

  const startWidths = () => { drag.current = { widths: [...row.widths], delta: 0, height: row.height }; };
  const liveWidths = (dividerIndex: number) => (deltaFraction: number) => {
    const el = rowRef.current;
    if (!el) return;
    const widths = [...drag.current.widths];
    const pair = widths[dividerIndex] + widths[dividerIndex + 1];
    const left = Math.max(MIN_WIDTH_FRACTION, Math.min(pair - MIN_WIDTH_FRACTION, widths[dividerIndex] + deltaFraction));
    widths[dividerIndex] = left;
    widths[dividerIndex + 1] = pair - left;
    drag.current.delta = left - drag.current.widths[dividerIndex];
    el.style.gridTemplateColumns = columnsFor(widths); // DOM-only, no store write
  };

  const startHeight = () => { drag.current = { widths: [...row.widths], delta: 0, height: row.height }; };
  const liveHeight = (deltaPx: number) => {
    const el = rowRef.current;
    if (!el) return;
    drag.current.delta = deltaPx;
    el.style.height = `${Math.max(120, drag.current.height + deltaPx)}px`;
  };

  return (
    <div className={cn("flex flex-col")}>
      <div ref={rowRef} data-dash-row={row.id}
        className={cn("grid items-stretch")}
        style={{ gridTemplateColumns: columnsFor(row.widths), height: row.height }}>
        {row.widgetIds.map((widgetId, i) => (
          <React.Fragment key={widgetId}>
            {i > 0 && (editMode
              ? <DashboardSplitter direction="col"
                onResizeStart={startWidths}
                onResize={liveWidths(i - 1)}
                onResizeEnd={() => onCommitWidths(i - 1, drag.current.delta)} />
              : <div style={{ width: SPLITTER_PX }} />)}
            <div data-dash-widget={widgetId} className={cn("min-w-0 min-h-0 flex flex-col")}>{renderWidget(widgetId)}</div>
          </React.Fragment>
        ))}
      </div>
      {editMode ? (
        <DashboardSplitter direction="row"
          onResizeStart={startHeight}
          onResize={liveHeight}
          onResizeEnd={() => onCommitHeight(drag.current.height + drag.current.delta)} />
      ) : (
        <div className={cn("h-1.5")} />
      )}
    </div>
  );
}
