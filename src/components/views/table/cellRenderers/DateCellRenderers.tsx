/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DateCellRenderers.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 10:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import type { CellRendererProps } from '../CellRenderer';
import { TimelineDatePicker } from '../../timeline/TimelineDatePicker';
import { cn } from '../../../../utils/cn';
import { safeString } from '../../../../utils/safeString';

/** Portal-based date picker cell editor anchored to the table cell. */
export function DateCellEditor({ page, prop, value, onUpdate, onStopEditing }: Readonly<{
  page: CellRendererProps['page'];
  prop: CellRendererProps['prop'];
  value: CellRendererProps['value'];
  onUpdate: CellRendererProps['onUpdate'];
  onStopEditing: CellRendererProps['onStopEditing'];
}>) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (measureRef.current) {
      const td = measureRef.current.closest('td');
      if (td) setRect(td.getBoundingClientRect());
    }
  }, []);

  const currentDate = value ? new Date(safeString(value)) : null;
  const isValidDate = currentDate !== null && !Number.isNaN(currentDate.getTime());

  return (
    <>
      <div ref={measureRef} className={cn("w-full h-0")} />
      <div className={cn("text-sm text-ink-body")}>
        {isValidDate
          ? currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : <span className={cn("text-ink-muted")}>Empty</span>}
      </div>
      {rect && (
        <TimelineDatePicker
          anchorRect={rect}
          startDate={isValidDate ? currentDate : null}
          endDate={null}
          hasEndDate={false}
          onChangeStart={d => onUpdate(page.id, prop.id, d.toISOString())}
          onChangeEnd={() => {}}
          onToggleEndDate={() => {}}
          onClear={() => { onUpdate(page.id, prop.id, null); onStopEditing(); }}
          onClose={onStopEditing}
        />
      )}
    </>
  );
}

/** Renders a date cell with a portal-based date picker when editing. */
export function renderDate(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing } = p;
  if (isEditing) {
    return <DateCellEditor page={page} prop={prop} value={value} onUpdate={onUpdate} onStopEditing={onStopEditing} />;
  }
  return (
    <div className={cn("text-sm text-ink-body truncate whitespace-nowrap")}>
      {value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className={cn("text-ink-muted")}>Empty</span>}
    </div>
  );
}
