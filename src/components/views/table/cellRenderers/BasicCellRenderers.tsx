/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BasicCellRenderers.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CellRendererProps } from '../CellRenderer';
import type { SchemaProperty, Page, PropertyValue } from '../../../../types/database';
import { ArrowUpRight, CheckCircle2, MapPin } from 'lucide-react';
import { TimelineDatePicker } from '../../timeline/TimelineDatePicker';
import { cn } from '../../../../utils/cn';
import { safeString } from '../../../../utils/safeString';

/** Inline input that buffers locally while the user types; commits on blur or Enter. */
export function InlineInput({ type = 'text', value, onChange, onStop, tableRef, className = '', placeholder = 'Empty', step }: Readonly<{
  type?: string; value: PropertyValue; onChange: (v: PropertyValue) => void; onStop: () => void;
  tableRef: React.RefObject<HTMLDivElement | null>; className?: string; placeholder?: string; step?: string;
}>) {
  const [local, setLocal] = useState<string>(safeString(value));
  const committed = useRef(false);

  // Sync from parent if value changes while NOT focused (e.g., undo/redo)
  useEffect(() => { setLocal(safeString(value)); }, [value]);

  const commit = useCallback(() => {
    if (committed.current) return;
    committed.current = true;
    let out: PropertyValue;
    if (type === 'number') out = local ? Number(local) : null;
    else out = local;
    onChange(out);
    onStop();
  }, [local, type, onChange, onStop]);

  return (
    <input
      autoFocus type={type} value={local} step={step}
      onChange={e => { committed.current = false; setLocal(e.target.value); }}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { commit(); tableRef.current?.focus(); }
        if (e.key === 'Escape') { committed.current = true; onStop(); tableRef.current?.focus(); }
      }}
      className={cn(`w-full bg-transparent outline-none text-sm ${className}`)}
      placeholder={placeholder}
    />
  );
}

/** Renders a title or text cell with inline editing and an "Open" button for title type. */
export function renderTitleOrText(p: CellRendererProps): React.ReactNode {
  const { prop, page, value, isEditing, wrapContent, onUpdate, onStopEditing, onOpenPage, tableRef } = p;
  if (isEditing) {
    return <InlineInput value={value || ''} onChange={v => onUpdate(page.id, prop.id, v)} onStop={onStopEditing} tableRef={tableRef} />;
  }
  return (
    <div className={cn("flex items-center gap-1")}>
      <div className={cn(`text-sm text-ink min-h-[20px] flex-1 min-w-0 ${prop.type === 'title' ? 'font-medium' : ''} ${wrapContent ? 'whitespace-pre-wrap break-words' : 'truncate max-w-full'}`)}>
        {value || <span className={cn("text-ink-muted")}>Empty</span>}
      </div>
      {prop.type === 'title' && (
        <button className={cn("shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-accent-text-soft bg-accent-soft hover:bg-hover-accent-muted px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap")}
          onClick={e => { e.stopPropagation(); onOpenPage(page.id); }}>
          <ArrowUpRight className={cn("w-3 h-3")} /> OPEN
        </button>
      )}
    </div>
  );
}

/** Renders a number cell with inline editing. */
export function renderNumber(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing, tableRef } = p;
  if (isEditing) {
    return (
      <InlineInput type="number" value={value ?? ''}
        onChange={v => onUpdate(page.id, prop.id, v)}
        onStop={onStopEditing} tableRef={tableRef} className={cn("tabular-nums text-ink")} />
    );
  }
  return (
    <div className={cn("text-sm text-ink tabular-nums truncate")}>
      {value != null && value !== '' ? Number(value).toLocaleString() : <span className={cn("text-ink-muted")}>Empty</span>}
    </div>
  );
}

/** Renders a checkbox toggle cell. */
export function renderCheckbox(value: PropertyValue): React.ReactNode {
  return (
    <div className={cn("flex items-center justify-center")}>
      <div className={cn(`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer ${value ? 'bg-accent border-accent-border' : 'border-line-medium hover:border-hover-border-strong'}`)}>
        {value && <CheckCircle2 className={cn("w-3 h-3 text-ink-inverse")} />}
      </div>
    </div>
  );
}

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

/** Renders a person/user cell with avatar and inline editing. */
export function renderPerson(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, wrapContent, onUpdate, onStopEditing, tableRef } = p;
  if (isEditing) {
    return <InlineInput value={value || ''} onChange={v => onUpdate(page.id, prop.id, v)} onStop={onStopEditing} tableRef={tableRef} placeholder="Name..." />;
  }
  if (!value) return <span className={cn("text-ink-muted text-sm")}>Empty</span>;
  return (
    <div className={cn("flex items-center gap-1.5")}>
      <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[10px] font-bold shrink-0")}>
        {safeString(value).charAt(0).toUpperCase()}
      </div>
      <span className={cn(`text-sm text-ink ${wrapContent ? 'break-words' : 'truncate'}`)}>{safeString(value)}</span>
    </div>
  );
}

/** Renders an email, URL, or phone cell as a styled link. */
export function renderEmailUrlPhone(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, wrapContent, onUpdate, onStopEditing, tableRef } = p;
  if (isEditing) {
    return <InlineInput value={value || ''} onChange={v => onUpdate(page.id, prop.id, v)} onStop={onStopEditing} tableRef={tableRef} />;
  }
  return value
    ? <span className={cn(`text-sm text-accent-text-light underline block ${wrapContent ? 'break-all' : 'truncate'}`)}>{value}</span>
    : <span className={cn("text-ink-muted text-sm")}>Empty</span>;
}

/** Renders a place/address cell with a map pin icon. */
export function renderPlace(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, wrapContent, onUpdate, onStopEditing, tableRef } = p;
  const placeVal = typeof value === 'object' && value ? value : null;
  if (isEditing) {
    return (
      <InlineInput value={placeVal?.address || (typeof value === 'string' ? value : '')}
        onChange={v => onUpdate(page.id, prop.id, { address: v })}
        onStop={onStopEditing} tableRef={tableRef} placeholder="Address..." />
    );
  }
  if (!placeVal?.address) return <span className={cn("text-ink-muted text-sm")}>Empty</span>;
  return (
    <div className={cn(`flex items-center gap-1.5 text-sm text-ink-body ${wrapContent ? '' : 'overflow-hidden'}`)}>
      <MapPin className={cn("w-3 h-3 text-ink-muted shrink-0")} />
      <span className={cn(wrapContent ? 'break-words' : 'truncate')}>{placeVal.address}</span>
    </div>
  );
}

/** Renders a read-only ID cell in monospace. */
export function renderId(value: PropertyValue): React.ReactNode {
  return (
    <div className={cn("text-sm text-ink-secondary font-mono tabular-nums truncate")}>
      {value || <span className={cn("text-ink-disabled")}>—</span>}
    </div>
  );
}

/** Renders a created_time or last_edited_time cell. */
export function renderTimestamp(prop: SchemaProperty, page: Page): React.ReactNode {
  const timeVal = prop.type === 'created_time' ? page.createdAt : page.updatedAt;
  return <div className={cn("text-sm text-ink-secondary truncate whitespace-nowrap")}>{timeVal ? new Date(timeVal).toLocaleString() : '—'}</div>;
}

/** Renders a created_by or last_edited_by cell with avatar. */
export function renderUserMeta(prop: SchemaProperty, page: Page): React.ReactNode {
  const userVal = prop.type === 'created_by' ? page.createdBy : page.lastEditedBy;
  if (!userVal) return <span className={cn("text-ink-muted text-sm")}>—</span>;
  return (
    <div className={cn("flex items-center gap-1.5 overflow-hidden")}>
      <div className={cn("w-5 h-5 rounded-full bg-surface-muted text-ink-body-light flex items-center justify-center text-[10px] font-bold shrink-0")}>
        {String(userVal).charAt(0).toUpperCase()}
      </div>
      <span className={cn("text-sm text-ink-body-light truncate")}>{userVal}</span>
    </div>
  );
}
