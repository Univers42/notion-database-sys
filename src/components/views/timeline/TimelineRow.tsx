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
  getBarGeometry, getGridCellBg, getDayRuleClass, computeBarLabel,
  type TimelineConfig, type ZoomLevel, type BarGeometry,
} from './TimelineViewHelpers';
import type { DragKind, DragState } from './timelineTypes';
import { RESIZE_HANDLE_WIDTH, BAR_V_PADDING } from './timelineTypes';
import {
  computeBarMeta, computeDragOverrides,
  BarContent, BarOutsideTitle, BarTooltip, LiveDragLabel,
} from './TimelineBarComponents';
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
  /** Grab-and-slide on a dateless lane: draw this record's date range. */
  readonly onLaneDraw: (e: React.PointerEvent, pageId: string, dayIdx: number) => void;
  /** Keyboard alternative: Enter/Space on a cell sets a single-day date. */
  readonly onLaneKeySet: (pageId: string, dayIdx: number) => void;
  readonly handlePointerDown: (e: React.PointerEvent, pageId: string, kind: DragKind, bar: BarGeometry) => void;
  readonly openDatePicker: (pageId: string, rect: DOMRect) => void;
}

export function TimelineRow({
  page, startPropId, endPropId, startDate, config, zoomLevel,
  statusProp, getPageTitle, dragState, hoverRow, setHoverRow,
  days, onLaneDraw, onLaneKeySet, handlePointerDown, openDatePicker,
}: TimelineRowProps) {
  const bar = getBarGeometry(page, startPropId, endPropId, startDate, config, zoomLevel);
  const { colorSet, statusLabel, dateLabel } = computeBarMeta(
    page.properties, startPropId, endPropId, statusProp, getPageTitle(page),
  );
  const title = getPageTitle(page);
  const { isDragging, displayLeft, displayWidth } = computeDragOverrides(page.id, dragState, bar);
  const isCreating = isDragging && dragState?.kind === 'create';
  const laneDrawable = !bar; // a dateless record: its lane is the create surface
  // A bar that starts before the range keeps its label on screen (Notion's
  // sticky title): the hidden part pads the label and doesn't count as room.
  const hiddenPx = Math.max(0, -displayLeft);
  const label = computeBarLabel(displayWidth - hiddenPx);
  const barHeight = config.rowHeight - BAR_V_PADDING * 2;

  return (
    <div // NOSONAR - timeline row pattern requires role="row"
      role="row"
      tabIndex={0}
      className={cn(`relative flex items-center transition-colors ${
        hoverRow === page.id ? 'bg-hover-surface-soft' : ''
      }`)}
      style={{ height: config.rowHeight }}
      onMouseEnter={() => setHoverRow(page.id)}
      onMouseLeave={() => setHoverRow(null)}
    >
      {/* Background grid cells — interactive ONLY on a dateless lane, where a
          press starts drawing this record's date range (click = single day). */}
      <div className={cn("absolute inset-0 flex pointer-events-none")}>
        {days.map((day, i) => (
          <div // NOSONAR - timeline grid cell pattern
            key={day.toISOString()}
            role={laneDrawable ? 'gridcell' : undefined}
            tabIndex={laneDrawable ? 0 : undefined}
            className={cn(`shrink-0 h-full pointer-events-auto ${getDayRuleClass(day, zoomLevel)}
                        ${laneDrawable ? 'cursor-cell' : ''} ${
              getGridCellBg(day.getDay() === 0 || day.getDay() === 6)
            }`)}
            style={{ width: config.cellWidth, touchAction: laneDrawable ? 'none' : undefined }}
            onPointerDown={e => { if (laneDrawable && e.button === 0) onLaneDraw(e, page.id, i); }}
            onKeyDown={e => { if (laneDrawable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onLaneKeySet(page.id, i); } }}
          />
        ))}
      </div>

      {(bar?.visible || isDragging) && (
        <div
          data-timeline-bar
          className={cn(`group/bar absolute z-10 flex items-center
                      bg-surface-primary text-ink
                      ${bar?.isPoint && !isDragging ? 'rounded-full' : 'rounded-md'}
                      ${isDragging ? 'opacity-80 ring-2 ring-accent-border' : ''}
                      ${isCreating ? 'border-2 border-dashed border-accent-border' : 'border border-line'}
                      shadow-sm hover:shadow-md transition-shadow`)}
          style={{
            left: displayLeft,
            width: Math.max(displayWidth, barHeight),
            height: barHeight,
            top: BAR_V_PADDING,
          }}
        >
          {isDragging && (
            <LiveDragLabel
              timelineStart={startDate} displayLeft={displayLeft}
              displayWidth={displayWidth} cellWidth={config.cellWidth}
            />
          )}
          <BarTooltip
            title={title || 'Untitled'}
            statusLabel={statusLabel || 'No status'}
            dateLabel={dateLabel}
            colorSet={colorSet}
          />

          {label === 'outside' && !isDragging && <BarOutsideTitle title={title} icon={page.icon} />}

          {/* Left resize handle */}
          <div
            className={cn(`absolute left-0 top-0 bottom-0 cursor-col-resize z-20
                       hover:bg-hover-surface rounded-l-md transition-colors`)}
            style={{ width: RESIZE_HANDLE_WIDTH }}
            onPointerDown={e => bar && handlePointerDown(e, page.id, 'resize-left', bar)}
          />

          {/* Bar body */}
          <button
            type="button"
            aria-label={`Edit dates for ${title || 'Untitled'}`}
            className={cn(`flex-1 flex items-center overflow-hidden min-w-0
                        h-full ${bar?.isPoint && !isDragging
                          ? 'cursor-ew-resize'
                          : 'cursor-grab active:cursor-grabbing'}`)}
            style={{
              marginLeft: RESIZE_HANDLE_WIDTH,
              marginRight: RESIZE_HANDLE_WIDTH,
              paddingLeft: hiddenPx,
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
            <BarContent label={label} title={title} statusHex={statusLabel ? colorSet.hex : undefined}
              dateLabel={dateLabel} icon={page.icon} />
          </button>

          {/* Right resize handle */}
          <div
            className={cn(`absolute right-0 top-0 bottom-0 cursor-col-resize z-20
                       hover:bg-hover-surface rounded-r-md transition-colors`)}
            style={{ width: RESIZE_HANDLE_WIDTH }}
            onPointerDown={e => bar && handlePointerDown(e, page.id, 'resize-right', bar)}
          />
        </div>
      )}

      {/* No-date indicator — on hover it teaches the create affordance. */}
      {!bar && !isDragging && (
        <div
          className={cn("absolute left-2 text-[10px] text-ink-disabled italic z-10 pointer-events-none")}
          style={{ top: (config.rowHeight - 14) / 2 }}
        >
          {hoverRow === page.id ? 'No date — drag on the lane to set one' : 'No date'}
        </div>
      )}
    </div>
  );
}
