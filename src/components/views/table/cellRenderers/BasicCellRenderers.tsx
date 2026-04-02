/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BasicCellRenderers.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:37:46 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { CellRendererProps } from '../CellRenderer';
import type { SchemaProperty, Page, PropertyValue } from '../../../../types/database';
import { ArrowUpRight, CheckCircle2, MapPin } from 'lucide-react';

// ─── Inline input shared by text, number, date, person, email/url/phone, place ──
export function InlineInput({ type = 'text', value, onChange, onStop, tableRef, className = '', placeholder = 'Empty', step }: Readonly<{
  type?: string; value: PropertyValue; onChange: (v: PropertyValue) => void; onStop: () => void;
  tableRef: React.RefObject<HTMLDivElement | null>; className?: string; placeholder?: string; step?: string;
}>) {
  return (
    <input
      autoFocus type={type} value={value ?? ''} step={step}
      onChange={e => onChange(e.target.value)}
      onBlur={onStop}
      onKeyDown={e => { if (e.key === 'Enter') { onStop(); tableRef.current?.focus(); } }}
      className={`w-full bg-transparent outline-none text-sm ${className}`}
      placeholder={placeholder}
    />
  );
}

export function renderTitleOrText(p: CellRendererProps): React.ReactNode {
  const { prop, page, value, isEditing, wrapContent, onUpdate, onStopEditing, onOpenPage, tableRef } = p;
  if (isEditing) {
    return <InlineInput value={value || ''} onChange={v => onUpdate(page.id, prop.id, v)} onStop={onStopEditing} tableRef={tableRef} />;
  }
  return (
    <div className="flex items-center gap-1">
      <div className={`text-sm text-ink min-h-[20px] flex-1 min-w-0 ${prop.type === 'title' ? 'font-medium' : ''} ${wrapContent ? 'whitespace-pre-wrap break-words' : 'truncate max-w-full'}`}>
        {value || <span className="text-ink-muted">Empty</span>}
      </div>
      {prop.type === 'title' && (
        <button className="shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-accent-text-soft bg-accent-soft hover:bg-hover-accent-muted px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap"
          onClick={e => { e.stopPropagation(); onOpenPage(page.id); }}>
          <ArrowUpRight className="w-3 h-3" /> OPEN
        </button>
      )}
    </div>
  );
}

export function renderNumber(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing, tableRef } = p;
  if (isEditing) {
    return (
      <InlineInput type="number" value={value ?? ''}
        onChange={v => onUpdate(page.id, prop.id, v ? Number(v) : null)}
        onStop={onStopEditing} tableRef={tableRef} className="tabular-nums text-ink" />
    );
  }
  return (
    <div className="text-sm text-ink tabular-nums truncate">
      {value != null && value !== '' ? Number(value).toLocaleString() : <span className="text-ink-muted">Empty</span>}
    </div>
  );
}

export function renderCheckbox(value: PropertyValue): React.ReactNode {
  return (
    <div className="flex items-center justify-center">
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer ${value ? 'bg-accent border-accent-border' : 'border-line-medium hover:border-hover-border-strong'}`}>
        {value && <CheckCircle2 className="w-3 h-3 text-ink-inverse" />}
      </div>
    </div>
  );
}

export function renderDate(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing, tableRef } = p;
  if (isEditing) {
    return (
      <InlineInput type="date"
        value={value ? new Date(value).toISOString().split('T')[0] : ''}
        onChange={v => onUpdate(page.id, prop.id, v ? new Date(v).toISOString() : null)}
        onStop={onStopEditing} tableRef={tableRef} className="text-ink-body" />
    );
  }
  return (
    <div className="text-sm text-ink-body truncate whitespace-nowrap">
      {value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-ink-muted">Empty</span>}
    </div>
  );
}

export function renderPerson(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, wrapContent, onUpdate, onStopEditing, tableRef } = p;
  if (isEditing) {
    return <InlineInput value={value || ''} onChange={v => onUpdate(page.id, prop.id, v)} onStop={onStopEditing} tableRef={tableRef} placeholder="Name..." />;
  }
  if (!value) return <span className="text-ink-muted text-sm">Empty</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[10px] font-bold shrink-0">
        {String(value).charAt(0).toUpperCase()}
      </div>
      <span className={`text-sm text-ink ${wrapContent ? 'break-words' : 'truncate'}`}>{value}</span>
    </div>
  );
}

export function renderEmailUrlPhone(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, wrapContent, onUpdate, onStopEditing, tableRef } = p;
  if (isEditing) {
    return <InlineInput value={value || ''} onChange={v => onUpdate(page.id, prop.id, v)} onStop={onStopEditing} tableRef={tableRef} />;
  }
  return value
    ? <span className={`text-sm text-accent-text-light underline block ${wrapContent ? 'break-all' : 'truncate'}`}>{value}</span>
    : <span className="text-ink-muted text-sm">Empty</span>;
}

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
  if (!placeVal?.address) return <span className="text-ink-muted text-sm">Empty</span>;
  return (
    <div className={`flex items-center gap-1.5 text-sm text-ink-body ${wrapContent ? '' : 'overflow-hidden'}`}>
      <MapPin className="w-3 h-3 text-ink-muted shrink-0" />
      <span className={wrapContent ? 'break-words' : 'truncate'}>{placeVal.address}</span>
    </div>
  );
}

export function renderId(value: PropertyValue): React.ReactNode {
  return (
    <div className="text-sm text-ink-secondary font-mono tabular-nums truncate">
      {value || <span className="text-ink-disabled">—</span>}
    </div>
  );
}

export function renderTimestamp(prop: SchemaProperty, page: Page): React.ReactNode {
  const timeVal = prop.type === 'created_time' ? page.createdAt : page.updatedAt;
  return <div className="text-sm text-ink-secondary truncate whitespace-nowrap">{timeVal ? new Date(timeVal).toLocaleString() : '—'}</div>;
}

export function renderUserMeta(prop: SchemaProperty, page: Page): React.ReactNode {
  const userVal = prop.type === 'created_by' ? page.createdBy : page.lastEditedBy;
  if (!userVal) return <span className="text-ink-muted text-sm">—</span>;
  return (
    <div className="flex items-center gap-1.5 overflow-hidden">
      <div className="w-5 h-5 rounded-full bg-surface-muted text-ink-body-light flex items-center justify-center text-[10px] font-bold shrink-0">
        {String(userVal).charAt(0).toUpperCase()}
      </div>
      <span className="text-sm text-ink-body-light truncate">{userVal}</span>
    </div>
  );
}
