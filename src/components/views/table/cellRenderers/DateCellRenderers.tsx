/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DateCellRenderers.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { addDays } from 'date-fns';
import type { CellRendererProps } from '../CellRenderer';
import { TimelineDatePicker } from '../../timeline/TimelineDatePicker';
import {
  formatDateValue, DEFAULT_DATE_FORMAT,
  type DateFormatLabel, type RemindOption,
} from '../../timeline/timelineDatePickerTypes';
import { cn } from '../../../../utils/cn';
import { safeString } from '../../../../utils/safeString';

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(safeString(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Portal-based date picker cell editor anchored to the table cell. A date
 * property may be PAIRED with an end property (prop.endPropertyId) — the
 * picker's End-date toggle creates the pairing on demand and the two plain
 * ISO date values form the interval (start → end).
 */
export function DateCellEditor({ page, prop, value, onUpdate, onStopEditing, databaseId, storeApi, tableRef }: Readonly<{
  page: CellRendererProps['page'];
  prop: CellRendererProps['prop'];
  value: CellRendererProps['value'];
  onUpdate: CellRendererProps['onUpdate'];
  onStopEditing: CellRendererProps['onStopEditing'];
  databaseId: CellRendererProps['databaseId'];
  storeApi: CellRendererProps['storeApi'];
  tableRef?: CellRendererProps['tableRef'];
}>) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Closing returns keyboard focus to the grid so arrow-navigation resumes.
  const close = () => { onStopEditing(); tableRef?.current?.focus(); };

  useEffect(() => {
    if (measureRef.current) {
      const td = measureRef.current.closest('td');
      if (td) setRect(td.getBoundingClientRect());
    }
  }, []);

  const currentDate = parseDate(value);
  const endDate = parseDate(prop.endPropertyId ? page.properties[prop.endPropertyId] : null);
  const fmtOpts = { format: prop.dateFormat, includeTime: prop.dateIncludeTime };
  const persist = (updates: Record<string, unknown>) =>
    storeApi.getState().updateProperty(databaseId, prop.id, updates);

  /** Resolve the paired end property — reuse the pairing or an existing
   *  "End Date" column, else create one; record the pairing on the schema. */
  const ensurePairedEndProp = (): string | null => {
    const state = storeApi.getState();
    const db = state.databases[databaseId];
    if (!db) return null;
    if (prop.endPropertyId && db.properties[prop.endPropertyId]) return prop.endPropertyId;
    const existing = Object.values(db.properties).find(
      p => p.id !== prop.id && (p.type === 'date' || p.type === 'due_date') && p.name === 'End Date',
    );
    const endId = existing?.id ?? state.addProperty(databaseId, 'End Date', 'date');
    state.updateProperty(databaseId, prop.id, { endPropertyId: endId });
    return endId;
  };

  return (
    <>
      <div ref={measureRef} className={cn("w-full h-0")} />
      <div className={cn("text-sm text-ink-body")}>
        {currentDate
          ? `${formatDateValue(currentDate, fmtOpts)}${endDate ? ` → ${formatDateValue(endDate, fmtOpts)}` : ''}`
          : <span className={cn("text-ink-muted")}>Empty</span>}
      </div>
      {rect && (
        <TimelineDatePicker
          anchorRect={rect}
          startDate={currentDate}
          endDate={endDate}
          hasEndDate={endDate !== null}
          dateFormat={(prop.dateFormat as DateFormatLabel) ?? DEFAULT_DATE_FORMAT}
          includeTime={prop.dateIncludeTime ?? false}
          remind={(prop.dateRemind as RemindOption) ?? 'None'}
          onChangeDateFormat={v => persist({ dateFormat: v })}
          onToggleIncludeTime={v => persist({ dateIncludeTime: v })}
          onChangeRemind={v => persist({ dateRemind: v })}
          onChangeStart={d => onUpdate(page.id, prop.id, d.toISOString())}
          onChangeEnd={d => {
            const endId = prop.endPropertyId;
            if (!endId) return;
            if (!d) { onUpdate(page.id, endId, null); return; }
            // The interval stays valid: an end before the start clamps to it.
            const safe = currentDate && d < currentDate ? currentDate : d;
            onUpdate(page.id, endId, safe.toISOString());
          }}
          onToggleEndDate={enabled => {
            if (!enabled) {
              if (prop.endPropertyId) onUpdate(page.id, prop.endPropertyId, null);
              return;
            }
            const endId = ensurePairedEndProp();
            if (!endId) return;
            const base = currentDate ?? new Date();
            if (!currentDate) onUpdate(page.id, prop.id, base.toISOString());
            onUpdate(page.id, endId, addDays(base, 3).toISOString());
          }}
          onClear={() => {
            onUpdate(page.id, prop.id, null);
            if (prop.endPropertyId) onUpdate(page.id, prop.endPropertyId, null);
            close();
          }}
          onClose={close}
        />
      )}
    </>
  );
}

/** Renders a date cell; a paired end value shows as "start → end". */
export function renderDate(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing, databaseId, storeApi, tableRef } = p;
  if (isEditing) {
    return (
      <DateCellEditor page={page} prop={prop} value={value} onUpdate={onUpdate}
        onStopEditing={onStopEditing} databaseId={databaseId} storeApi={storeApi} tableRef={tableRef} />
    );
  }
  const fmtOpts = { format: prop.dateFormat, includeTime: prop.dateIncludeTime };
  const label = formatDateValue(value, fmtOpts);
  const endLabel = prop.endPropertyId ? formatDateValue(page.properties[prop.endPropertyId], fmtOpts) : null;
  return (
    <div className={cn("text-sm text-ink-body truncate whitespace-nowrap")}>
      {label
        ? `${label}${endLabel ? ` → ${endLabel}` : ''}`
        : <span className={cn("text-ink-muted")}>{value ? safeString(value) : 'Empty'}</span>}
    </div>
  );
}
