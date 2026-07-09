/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarEventPopover.tsx                            :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarEventPopover — quick date edit on a chip ───────────────────────
// The SAME panel the table's date cell opens (TimelineDatePicker), anchored
// to the chip rect and writing through the same seams, so calendar and table
// always render one interval.

import React from 'react';
import { addDays } from 'date-fns';
import { TimelineDatePicker } from '../timeline/TimelineDatePicker';
import { DEFAULT_DATE_FORMAT } from '../timeline/timelineDatePickerTypes';
import type { DateFormatLabel, RemindOption } from '../timeline/timelineDatePickerTypes';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import type { Page, SchemaProperty } from '../../../types/database';

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function CalendarEventPopover({
  page, anchorRect, startProp, databaseId,
  updatePageProperty, ensureEndProp, onClose,
}: Readonly<{
  page: Page;
  anchorRect: DOMRect;
  startProp: SchemaProperty;
  databaseId: string;
  updatePageProperty: (pageId: string, propId: string, value: string | null) => void;
  ensureEndProp: () => SchemaProperty | null;
  onClose: () => void;
}>) {
  const storeApi = useStoreApi();
  const startDate = parseDate(page.properties[startProp.id]);
  const endDate = parseDate(startProp.endPropertyId ? page.properties[startProp.endPropertyId] : null);
  const persist = (updates: Record<string, unknown>): void => {
    storeApi.getState().updateProperty(databaseId, startProp.id, updates);
  };

  return (
    <TimelineDatePicker
      anchorRect={anchorRect}
      startDate={startDate}
      endDate={endDate}
      hasEndDate={endDate !== null}
      dateFormat={(startProp.dateFormat as DateFormatLabel) ?? DEFAULT_DATE_FORMAT}
      includeTime={startProp.dateIncludeTime ?? false}
      remind={(startProp.dateRemind as RemindOption) ?? 'None'}
      onChangeDateFormat={v => persist({ dateFormat: v })}
      onToggleIncludeTime={v => persist({ dateIncludeTime: v })}
      onChangeRemind={v => persist({ dateRemind: v })}
      onChangeStart={d => updatePageProperty(page.id, startProp.id, d.toISOString())}
      onChangeEnd={d => {
        const endId = startProp.endPropertyId;
        if (!endId) return;
        if (!d) { updatePageProperty(page.id, endId, null); return; }
        // The interval stays valid: an end before the start clamps to it.
        const safe = startDate && d < startDate ? startDate : d;
        updatePageProperty(page.id, endId, safe.toISOString());
      }}
      onToggleEndDate={enabled => {
        if (!enabled) {
          if (startProp.endPropertyId) updatePageProperty(page.id, startProp.endPropertyId, null);
          return;
        }
        const endProp = ensureEndProp();
        if (!endProp) return;
        const base = startDate ?? new Date();
        if (!startDate) updatePageProperty(page.id, startProp.id, base.toISOString());
        updatePageProperty(page.id, endProp.id, addDays(base, 3).toISOString());
      }}
      onClear={() => {
        updatePageProperty(page.id, startProp.id, null);
        if (startProp.endPropertyId) updatePageProperty(page.id, startProp.endPropertyId, null);
        onClose();
      }}
      onClose={onClose}
    />
  );
}
