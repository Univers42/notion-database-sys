/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SpecialCellRenderers.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SpecialCellRenderers.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { CellRendererProps } from '../CellRenderer';
import type { FileAttachment, SchemaProperty, PropertyValue } from '../../../../types/database';
import { renderCheckbox, DateCellEditor } from './BasicCellRenderers';
import { FilesCellEditor, fileKind } from '../../../cellEditors/FilesCellEditor';
import { executeButtonActions, type ButtonActionContext } from '../../../../lib/automations/actionExecutor';
import { AUTOMATION_FIRED_EVENT } from '../../../../lib/automations/automationRunner';
import { cn } from '../../../../utils/cn';
import { safeString } from '../../../../utils/safeString';

const CELL_DROP_DATA_URL_LIMIT = 8 * 1024 * 1024;

/** Converts dropped files (data-URL fallback, ≤8 MB each) and appends them.
 *  Takes a snapshot array — a live FileList empties once the drop event ends,
 *  losing every file after the first await. */
async function ingestDroppedFiles(
  files: readonly File[],
  current: FileAttachment[],
  commit: (next: FileAttachment[]) => void,
): Promise<void> {
  const added: FileAttachment[] = [];
  for (const file of files) {
    if (file.size > CELL_DROP_DATA_URL_LIMIT) continue;
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }).catch(() => null);
    if (url) added.push({ id: `f-${Date.now().toString(36)}-${added.length}`, name: file.name, url, type: fileKind(file.type || file.name), size: file.size });
  }
  if (added.length > 0) commit([...current, ...added]);
}

/** Renders a files/media cell: attachment chips, the Upload/Link editor when
 *  editing, and direct drag-drop of system files onto the cell. */
export function renderFilesMedia(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, wrapContent, onUpdate, onStopEditing } = p;
  const attachments: FileAttachment[] = Array.isArray(value) ? value : [];
  // Wrap on → every attachment stacks across lines (no cap); wrap off → a single
  // clipped row of the first few plus a "+N" overflow (parity with multi-select).
  const shown = wrapContent ? attachments : attachments.slice(0, 3);
  const display = (
    <div
      className={cn(`flex items-center gap-1.5 text-sm min-h-[20px] ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`)}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={e => {
        // Dropping files straight onto the cell attaches them — no editor needed.
        e.preventDefault();
        e.stopPropagation();
        void ingestDroppedFiles([...e.dataTransfer.files], attachments, next => onUpdate(page.id, prop.id, next));
      }}
    >
      {attachments.length === 0 && <span className={cn("text-ink-muted italic truncate")}>No files</span>}
      {shown.map(file =>
        file.type === 'image'
          ? <img key={file.id} src={file.url} alt={file.name} className={cn("w-5 h-5 rounded object-cover shrink-0")} />
          : <span key={file.id} className={cn("px-1.5 py-0.5 rounded bg-surface-tertiary text-xs text-ink-body truncate max-w-[110px]")}>{file.name}</span>,
      )}
      {!wrapContent && attachments.length > 3 && <span className={cn("text-xs text-ink-muted")}>+{attachments.length - 3}</span>}
    </div>
  );
  if (!isEditing) return display;
  return (
    <>
      {display}
      <FilesCellEditor value={attachments} onUpdate={v => onUpdate(page.id, prop.id, v)} onClose={onStopEditing} />
    </>
  );
}

/** Fires a button cell's configured actions. Shared by the click handler and
 *  keyboard activation (Enter on a focused button cell) — one implementation.
 *  With an `actions` list + row context it runs the full Notion action set
 *  (edit property / add page / notify / webhook / open URL); the legacy
 *  single-action config keeps working without context. */
export function runButtonAction(prop: SchemaProperty, ctx?: ButtonActionContext): void {
  const config = prop.buttonConfig;
  if (!config) return;
  if (config.actions?.length && ctx) {
    executeButtonActions(config.actions, ctx, config.label || prop.name);
    return;
  }
  if (config.action === 'open_url' && config.url) window.open(config.url, '_blank', 'noopener');
  else if (config.action === 'copy') navigator.clipboard?.writeText(config.url || '');
  else if (config.action === 'notify' && globalThis.window !== undefined) {
    globalThis.dispatchEvent(new CustomEvent(AUTOMATION_FIRED_EVENT, {
      detail: { ruleId: `button:${prop.id}`, ruleName: config.label || prop.name, message: config.label || prop.name },
    }));
  }
}

/** Renders a clickable button cell running its configured actions on the row. */
export function renderButton(p: CellRendererProps): React.ReactNode {
  const { prop, page, databaseId, storeApi } = p;
  return (
    <button className={cn("px-2.5 py-0.5 bg-surface-tertiary hover:bg-hover-surface3 text-xs font-medium text-ink-body rounded-md")}
      onClick={e => { e.stopPropagation(); runButtonAction(prop, { storeApi, page, databaseId }); }}>
      {prop.buttonConfig?.label || 'Click'}
    </button>
  );
}

/** Renders a due-date cell with urgency badge when editing or displaying. */
export function renderDueDate(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing, databaseId, storeApi, tableRef } = p;
  const dateVal = value ? new Date(value) : null;
  if (isEditing) {
    return <DateCellEditor page={page} prop={prop} value={value} onUpdate={onUpdate}
      onStopEditing={onStopEditing} databaseId={databaseId} storeApi={storeApi} tableRef={tableRef} />;
  }
  if (!dateVal) return <span className={cn("text-ink-muted")}>Empty</span>;
  return renderDueDateBadge(dateVal);
}

/** Renders an urgency badge (Overdue, Today, Xd left) for a due date value. */
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
    <div className={cn("flex items-center gap-1.5 text-sm truncate")}>
      {dueBadge && <span className={cn(`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeClass}`)}>{dueBadge}</span>}
      <span className={cn(dueColor)}>{dateVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
    </div>
  );
}

/** Renders a custom-typed cell, delegating to the appropriate editor or display. */
export function renderCustom(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing, tableRef } = p;
  const dt = prop.customConfig?.dataType || 'string';
  if (isEditing) return renderCustomEditor(dt, value, v => onUpdate(page.id, prop.id, v), onStopEditing, tableRef);
  return renderCustomDisplay(dt, value);
}

const DATA_TYPE_INPUT_MAP: Record<string, string> = {
  integer: 'number',
  float: 'number',
  timestamp: 'datetime-local',
};

export function renderCustomEditor(dt: string, value: PropertyValue, onChange: (v: PropertyValue) => void, onStop: () => void, tableRef: React.RefObject<HTMLDivElement | null>): React.ReactNode {
  const inputType = DATA_TYPE_INPUT_MAP[dt] || 'text';
  return (
    <input autoFocus type={inputType} step={dt === 'float' ? '0.01' : undefined}
      value={dt === 'boolean' ? undefined : (value ?? '')}
      onChange={e => {
        let v: PropertyValue = e.target.value;
        if (dt === 'integer') v = Number.parseInt(v) || 0;
        else if (dt === 'float') v = Number.parseFloat(v) || 0;
        else if (dt === 'json') { try { v = JSON.parse(v); } catch { /* keep string */ } }
        onChange(v);
      }}
      onBlur={onStop}
      onKeyDown={e => { if (e.key === 'Enter') { onStop(); tableRef.current?.focus(); } }}
      className={cn("w-full bg-transparent outline-none text-sm font-mono")} />
  );
}

/** Renders the read-only display for a custom-typed cell. */
export function renderCustomDisplay(dt: string, value: PropertyValue): React.ReactNode {
  if (dt === 'boolean') return renderCheckbox(value);
  if (dt === 'timestamp') {
    return <div className={cn("text-sm text-ink-secondary font-mono truncate")}>{value ? new Date(value).toLocaleString() : <span className={cn("text-ink-muted")}>—</span>}</div>;
  }
  if (dt === 'json') {
    return <div className={cn("text-sm text-ink-body-light font-mono truncate")}>{value ? JSON.stringify(value) : <span className={cn("text-ink-muted")}>{'{}'}</span>}</div>;
  }
  const display = value != null && value !== '' ? safeString(value) : null;
  if (!display) return <span className={cn("text-ink-muted text-sm")}>Empty</span>;
  return (
    <div className={cn(`text-sm text-ink font-mono ${dt === 'integer' || dt === 'float' ? 'tabular-nums' : ''} truncate`)}>
      {dt === 'integer' || dt === 'float' ? Number(display).toLocaleString() : display}
    </div>
  );
}
