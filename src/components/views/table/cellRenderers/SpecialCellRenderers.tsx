/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SpecialCellRenderers.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:37:46 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { CellRendererProps } from '../CellRenderer';
import type { SchemaProperty } from '../../../../types/database';
import { InlineInput, renderCheckbox } from './BasicCellRenderers';

export function renderFilesMedia(value: any): React.ReactNode {
  return (
    <div className="text-sm text-ink-muted italic truncate">
      {Array.isArray(value) && value.length > 0 ? `${value.length} file(s)` : 'No files'}
    </div>
  );
}

export function renderButton(prop: SchemaProperty): React.ReactNode {
  return (
    <button className="px-2.5 py-0.5 bg-surface-tertiary hover:bg-hover-surface3 text-xs font-medium text-ink-body rounded-md"
      onClick={e => {
        e.stopPropagation();
        if (prop.buttonConfig?.action === 'open_url' && prop.buttonConfig?.url) window.open(prop.buttonConfig.url, '_blank');
        else if (prop.buttonConfig?.action === 'copy') navigator.clipboard?.writeText(prop.buttonConfig?.url || '');
      }}>
      {prop.buttonConfig?.label || 'Click'}
    </button>
  );
}

export function renderDueDate(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing, tableRef } = p;
  const dateVal = value ? new Date(value) : null;
  if (isEditing) {
    return (
      <InlineInput type="date" value={dateVal ? dateVal.toISOString().split('T')[0] : ''}
        onChange={v => onUpdate(page.id, prop.id, v ? new Date(v).toISOString() : null)}
        onStop={onStopEditing} tableRef={tableRef} className="text-ink-body" />
    );
  }
  if (!dateVal) return <span className="text-ink-muted">Empty</span>;
  return renderDueDateBadge(dateVal);
}

export function renderDueDateBadge(dateVal: Date): React.ReactNode {
  const now = new Date();
  const diffDays = Math.ceil((dateVal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  let dueBadge = '';
  let dueColor = 'text-ink-body';
  let badgeClass = '';
  if (diffDays < 0) { dueBadge = 'Overdue'; dueColor = 'text-danger-text'; badgeClass = 'bg-danger-surface-muted text-danger-text-bold'; }
  else if (diffDays === 0) { dueBadge = 'Today'; dueColor = 'text-orange-text'; badgeClass = 'bg-orange-surface-muted text-orange-text-bold'; }
  else if (diffDays <= 3) { dueBadge = `${diffDays}d left`; dueColor = 'text-warning-text'; badgeClass = 'bg-warning-surface-muted text-warning-text-bold'; }
  return (
    <div className="flex items-center gap-1.5 text-sm truncate">
      {dueBadge && <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeClass}`}>{dueBadge}</span>}
      <span className={dueColor}>{dateVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
    </div>
  );
}

export function renderCustom(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing, tableRef } = p;
  const dt = prop.customConfig?.dataType || 'string';
  if (isEditing) return renderCustomEditor(dt, value, v => onUpdate(page.id, prop.id, v), onStopEditing, tableRef);
  return renderCustomDisplay(dt, value);
}

export function renderCustomEditor(dt: string, value: any, onChange: (v: any) => void, onStop: () => void, tableRef: React.RefObject<HTMLDivElement | null>): React.ReactNode {
  const inputType = dt === 'integer' || dt === 'float' ? 'number' : dt === 'timestamp' ? 'datetime-local' : 'text';
  return (
    <input autoFocus type={inputType} step={dt === 'float' ? '0.01' : undefined}
      value={dt === 'boolean' ? undefined : (value ?? '')}
      onChange={e => {
        let v: any = e.target.value;
        if (dt === 'integer') v = parseInt(v) || 0;
        else if (dt === 'float') v = parseFloat(v) || 0;
        else if (dt === 'json') { try { v = JSON.parse(v); } catch { /* keep string */ } }
        onChange(v);
      }}
      onBlur={onStop}
      onKeyDown={e => { if (e.key === 'Enter') { onStop(); tableRef.current?.focus(); } }}
      className="w-full bg-transparent outline-none text-sm font-mono" />
  );
}

export function renderCustomDisplay(dt: string, value: any): React.ReactNode {
  if (dt === 'boolean') return renderCheckbox(value);
  if (dt === 'timestamp') {
    return <div className="text-sm text-ink-secondary font-mono truncate">{value ? new Date(value).toLocaleString() : <span className="text-ink-muted">—</span>}</div>;
  }
  if (dt === 'json') {
    return <div className="text-sm text-ink-body-light font-mono truncate">{value ? JSON.stringify(value) : <span className="text-ink-muted">{'{}'}</span>}</div>;
  }
  const display = value != null && value !== '' ? String(value) : null;
  if (!display) return <span className="text-ink-muted text-sm">Empty</span>;
  return (
    <div className={`text-sm text-ink font-mono ${dt === 'integer' || dt === 'float' ? 'tabular-nums' : ''} truncate`}>
      {dt === 'integer' || dt === 'float' ? Number(display).toLocaleString() : display}
    </div>
  );
}
