/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineRow.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { Page } from '../../../types/database';
import {
  getBarGeometry, getGridCellBg, computeBarVerbosity,
  type TimelineConfig, type ZoomLevel, type BarGeometry,
} from './TimelineViewHelpers';
import type { DragKind, DragState } from './timelineTypes';
import { RESIZE_HANDLE_WIDTH, BAR_V_PADDING } from './timelineTypes';
import { computeBarMeta, computeDragOverrides, BarContent, BarTooltip } from './TimelineBarComponents';
import { cn } from '../../../utils/cn';

interface TimelineRowProps {
  readonly page: Page;
  readonly startPropId: string;
  readonly endPropId: string | null;
  readonly startDate: Date;
  readonly config: TimelineConfig;
  readonly zoomLevel: ZoomLevel;
  readonly statusProp: { id: string; options?: { id: string; value: string; color: string }[] } | undefined;
  readonly getPageTitle: (page: Page) => string;
  readonly dragState: DragState | null;
  readonly hoverRow: string | null;
  readonly setHoverRow: (id: string | null) => void;
  readonly days: Date[];
  readonly todayIdx: number;
  readonly handleGridCellClick: (dayIdx: number) => void;
  readonly handlePointerDown: (e: React.PointerEvent, pageId: string, kind: DragKind, bar: BarGeometry) => void;
  readonly openDatePicker: (pageId: string, rect: DOMRect) => void;
}

export function TimelineRow({
  page, startPropId, endPropId, startDate, config, zoomLevel,
  statusProp, getPageTitle, dragState, hoverRow, setHoverRow,
  days, todayIdx, handleGridCellClick, handlePointerDown, openDatePicker,
}: TimelineRowProps) {
  const bar = getBarGeometry(page, startPropId, endPropId, startDate, config, zoomLevel);
  const { colorSet, statusLabel, dateLabel } = computeBarMeta(
    page.properties, startPropId, endPropId, statusProp, getPageTitle(page),
  );
  const title = getPageTitle(page);
  const { isDragging, displayLeft, displayWidth } = computeDragOverrides(page.id, dragState, bar);
  const verbosity = computeBarVerbosity(displayWidth, config.cellWidth);
  const barHeight = config.rowHeight - BAR_V_PADDING * 2;

  return (
    <div // NOSONAR - timeline row pattern requires role="row"
      role="row"
      tabIndex={0}
      className={cn(`relative flex items-center border-b border-line-light transition-colors ${
        hoverRow === page.id ? 'bg-hover-surface-soft' : ''
      }`)}
      style={{ height: config.rowHeight }}
      onMouseEnter={() => setHoverRow(page.id)}
      onMouseLeave={() => setHoverRow(null)}
    >
      {/* Background grid cells */}
      <div className={cn("absolute inset-0 flex pointer-events-none")}>
        {days.map((day, i) => (
          <div // NOSONAR - timeline grid cell pattern
            key={day.toISOString()}
            role="gridcell"
            tabIndex={0}
            className={cn(`shrink-0 border-r border-line-light h-full pointer-events-auto
                        cursor-cell ${
              getGridCellBg(todayIdx === i, day.getDay() === 0 || day.getDay() === 6)
            }`)}
            style={{ width: config.cellWidth }}
            onClick={() => handleGridCellClick(i)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGridCellClick(i); } }}
          />
        ))}
      </div>

      {(bar?.visible || isDragging) && (
        <div
          className={cn(`group/bar absolute z-10 flex items-center
                      ${colorSet.bg} ${colorSet.text}
                      ${bar?.isPoint && !isDragging ? 'rounded-full' : 'rounded-md'}
                      ${isDragging ? 'opacity-80 ring-2 ring-accent-border' : ''}
                      shadow-sm transition-shadow`)}
          style={{
            left: displayLeft,
            width: Math.max(displayWidth, barHeight),
            height: barHeight,
            top: BAR_V_PADDING,
          }}
        >
          <BarTooltip
            title={title || 'Untitled'}
            statusLabel={statusLabel || 'No status'}
            dateLabel={dateLabel}
            colorSet={colorSet}
          />

          {/* Left resize handle */}
          <div
            className={cn(`absolute left-0 top-0 bottom-0 cursor-col-resize z-20
                       hover:bg-white/30 rounded-l-md transition-colors`)}
            style={{ width: RESIZE_HANDLE_WIDTH }}
            onPointerDown={e => bar && handlePointerDown(e, page.id, 'resize-left', bar)}
          />

          {/* Bar body */}
          <button
            type="button"
            className={cn(`flex-1 flex items-center justify-center overflow-hidden
                        h-full ${bar?.isPoint && !isDragging
                          ? 'cursor-ew-resize'
                          : 'cursor-grab active:cursor-grabbing'}`)}
            style={{
              marginLeft: RESIZE_HANDLE_WIDTH,
              marginRight: RESIZE_HANDLE_WIDTH,
            }}
            onPointerDown={e => {
              if (bar) {
                const kind: DragKind = bar.isPoint ? 'resize-right' : 'move';
                handlePointerDown(e, page.id, kind, bar);
              }
            }}
            onClick={e => {
              if (dragState?.hasMoved) return;
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              openDatePicker(page.id, rect);
            }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); openDatePicker(page.id, rect); } }}
          >
            <BarContent verbosity={verbosity} statusLabel={statusLabel} dateLabel={dateLabel} icon={page.icon} />
          </button>

          {/* Right resize handle */}
          <div
            className={cn(`absolute right-0 top-0 bottom-0 cursor-col-resize z-20
                       hover:bg-white/30 rounded-r-md transition-colors`)}
            style={{ width: RESIZE_HANDLE_WIDTH }}
            onPointerDown={e => bar && handlePointerDown(e, page.id, 'resize-right', bar)}
          />
        </div>
      )}

      {/* No-date indicator */}
      {!bar && !isDragging && (
        <div
          className={cn("absolute left-2 text-[10px] text-ink-disabled italic z-10 pointer-events-none")}
          style={{ top: (config.rowHeight - 14) / 2 }}
        >
          No date
        </div>
      )}
    </div>
  );
}
