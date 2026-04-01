// ═══════════════════════════════════════════════════════════════════════════════
// Cell content renderer — maps property type → React node
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { SchemaProperty, Page } from '../../../types/database';
import { SelectEditor, MultiSelectEditor } from './SelectEditors';
import { RelationCellEditor, StatusCellEditor } from '../../cellEditors';
import {
  ArrowUpRight, CheckCircle2, MapPin, Plus, Sigma,
} from 'lucide-react';

export interface CellRendererProps {
  prop: SchemaProperty;
  page: Page;
  value: any;
  isEditing: boolean;
  wrapContent: boolean;
  databaseId: string;
  onUpdate: (pageId: string, propId: string, value: any) => void;
  onStopEditing: () => void;
  onOpenPage: (pageId: string) => void;
  onFormulaEdit: (propId: string) => void;
  onPropertyConfig: (prop: SchemaProperty, position: { top: number; left: number }) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
}

// ─── Inline input shared by text, number, date, person, email/url/phone, place ──
function InlineInput({ type = 'text', value, onChange, onStop, tableRef, className = '', placeholder = 'Empty', step }: {
  type?: string; value: any; onChange: (v: any) => void; onStop: () => void;
  tableRef: React.RefObject<HTMLDivElement | null>; className?: string; placeholder?: string; step?: string;
}) {
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

// ─── Individual cell renderers (max 25 lines each) ──────────────────────────

function renderTitleOrText(p: CellRendererProps): React.ReactNode {
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

function renderNumber(p: CellRendererProps): React.ReactNode {
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

function renderSelect(p: CellRendererProps): React.ReactNode {
  const { prop, page, value, isEditing, databaseId, onUpdate, onStopEditing, tableRef } = p;
  const selOpt = prop.options?.find(o => o.id === value);
  if (isEditing) {
    return (
      <SelectEditor property={prop} value={value} databaseId={databaseId}
        onUpdate={v => onUpdate(page.id, prop.id, v)}
        onClose={() => { onStopEditing(); tableRef.current?.focus(); }} />
    );
  }
  return selOpt
    ? <div className="flex items-center gap-1.5"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${selOpt.color}`}>{selOpt.value}</span></div>
    : <span className="text-ink-muted text-sm">Empty</span>;
}

function renderStatus(p: CellRendererProps): React.ReactNode {
  const { prop, page, value, isEditing, databaseId, onUpdate, onStopEditing, onPropertyConfig, tableRef } = p;
  const statusOpt = prop.options?.find(o => o.id === value);
  if (isEditing) {
    return (
      <StatusCellEditor property={prop} value={value} databaseId={databaseId}
        onUpdate={v => onUpdate(page.id, prop.id, v)}
        onClose={() => { onStopEditing(); tableRef.current?.focus(); }}
        onEditProperty={() => { onStopEditing(); onPropertyConfig(prop, { top: 200, left: 200 }); }} />
    );
  }
  return statusOpt
    ? <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${statusOpt.color.split(' ')[0]}`} /><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusOpt.color}`}>{statusOpt.value}</span></div>
    : <span className="text-ink-muted text-sm">Empty</span>;
}

function renderMultiSelect(p: CellRendererProps): React.ReactNode {
  const { prop, page, value, isEditing, wrapContent, databaseId, onUpdate, onStopEditing, tableRef } = p;
  const msIds: string[] = Array.isArray(value) ? value : [];
  if (isEditing) {
    return (
      <MultiSelectEditor property={prop} value={value} databaseId={databaseId}
        onUpdate={v => onUpdate(page.id, prop.id, v)}
        onClose={() => { onStopEditing(); tableRef.current?.focus(); }} />
    );
  }
  return (
    <div className={`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
      {msIds.length > 0 ? msIds.map(id => {
        const opt = prop.options?.find(o => o.id === id);
        return opt ? <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${opt.color}`}>{opt.value}</span> : null;
      }) : <span className="text-ink-muted text-sm">Empty</span>}
    </div>
  );
}

function renderDate(p: CellRendererProps): React.ReactNode {
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

function renderCheckbox(value: any): React.ReactNode {
  return (
    <div className="flex items-center justify-center">
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer ${value ? 'bg-accent border-accent-border' : 'border-line-medium hover:border-hover-border-strong'}`}>
        {value && <CheckCircle2 className="w-3 h-3 text-ink-inverse" />}
      </div>
    </div>
  );
}

function renderPerson(p: CellRendererProps): React.ReactNode {
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

function renderEmailUrlPhone(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, wrapContent, onUpdate, onStopEditing, tableRef } = p;
  if (isEditing) {
    return <InlineInput value={value || ''} onChange={v => onUpdate(page.id, prop.id, v)} onStop={onStopEditing} tableRef={tableRef} />;
  }
  return value
    ? <span className={`text-sm text-accent-text-light underline block ${wrapContent ? 'break-all' : 'truncate'}`}>{value}</span>
    : <span className="text-ink-muted text-sm">Empty</span>;
}

function renderPlace(p: CellRendererProps): React.ReactNode {
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

function renderId(value: any): React.ReactNode {
  return (
    <div className="text-sm text-ink-secondary font-mono tabular-nums truncate">
      {value || <span className="text-ink-disabled">—</span>}
    </div>
  );
}

function renderFilesMedia(value: any): React.ReactNode {
  return (
    <div className="text-sm text-ink-muted italic truncate">
      {Array.isArray(value) && value.length > 0 ? `${value.length} file(s)` : 'No files'}
    </div>
  );
}

function renderButton(prop: SchemaProperty): React.ReactNode {
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

function renderFormula(p: CellRendererProps): React.ReactNode {
  const { prop, page, databaseId, onFormulaEdit } = p;
  const resolveFormula = useDatabaseStore.getState().resolveFormula;
  const formulaResult = prop.formulaConfig
    ? resolveFormula(databaseId, page, prop.formulaConfig.expression)
    : '#N/A';
  return (
    <div className="text-sm text-ink-body tabular-nums truncate font-mono cursor-pointer group/formula"
      onClick={e => { e.stopPropagation(); onFormulaEdit(prop.id); }} title="Click to edit formula">
      <div className="flex items-center gap-1.5">
        <span className="truncate">
          {formulaResult != null && formulaResult !== '' && formulaResult !== '#ERROR'
            ? (typeof formulaResult === 'number' ? formulaResult.toLocaleString() : String(formulaResult))
            : <span className="text-danger-text-faint">{formulaResult === '#ERROR' ? '#ERROR' : 'Empty'}</span>}
        </span>
        <Sigma className="w-3 h-3 text-ink-disabled opacity-0 group-hover/formula:opacity-100 shrink-0" />
      </div>
    </div>
  );
}

function renderRollup(p: CellRendererProps): React.ReactNode {
  const { prop, page, databaseId, wrapContent } = p;
  const resolveRollup = useDatabaseStore.getState().resolveRollup;
  const rollupResult = resolveRollup(databaseId, page, prop.id);
  const displayAs = prop.rollupConfig?.displayAs || 'number';

  if (rollupResult == null) return <span className="text-ink-muted text-sm">—</span>;

  if (Array.isArray(rollupResult)) return renderRollupArray(rollupResult, wrapContent);
  if (displayAs === 'bar' && typeof rollupResult === 'number') return renderRollupBar(rollupResult);
  if (displayAs === 'ring' && typeof rollupResult === 'number') return renderRollupRing(rollupResult);
  return (
    <div className="text-sm text-ink-body tabular-nums truncate font-mono">
      {typeof rollupResult === 'number' ? rollupResult.toLocaleString() : String(rollupResult)}
    </div>
  );
}

function renderRollupArray(arr: any[], wrapContent: boolean): React.ReactNode {
  if (arr.length === 0) return <span className="text-ink-muted text-sm">Empty</span>;
  return (
    <div className={`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
      {arr.map((v, i) => (
        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-tertiary text-xs text-ink-body-light font-medium shrink-0 max-w-[120px] truncate">
          {v === true ? '✓' : v === false ? '✗' : String(v ?? '—')}
        </span>
      ))}
    </div>
  );
}

function renderRollupBar(value: number): React.ReactNode {
  const pct = Math.min(100, Math.max(0, (value / 15) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden min-w-[40px]">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-ink-secondary tabular-nums shrink-0">{value}</span>
    </div>
  );
}

function renderRollupRing(value: number): React.ReactNode {
  const pct = Math.min(100, Math.max(0, value));
  const r = 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const stroke = pct >= 80 ? 'var(--color-progress-high)' : pct >= 50 ? 'var(--color-chart-1)' : pct >= 25 ? 'var(--color-chart-4)' : 'var(--color-chart-7)';
  return (
    <div className="flex items-center gap-2">
      <svg width="22" height="22" className="shrink-0 -rotate-90">
        <circle cx="11" cy="11" r={r} fill="none" stroke="var(--color-chart-grid)" strokeWidth="3" />
        <circle cx="11" cy="11" r={r} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <span className="text-xs text-ink-body-light tabular-nums">{pct}%</span>
    </div>
  );
}

function renderRelation(p: CellRendererProps): React.ReactNode {
  const { prop, page, value, isEditing, wrapContent, databaseId, onUpdate, onStopEditing, onOpenPage, tableRef } = p;
  const relatedIds: string[] = Array.isArray(value) ? value : [];
  if (isEditing) {
    return (
      <RelationCellEditor property={prop} value={value} pageId={page.id} databaseId={databaseId}
        onUpdate={v => onUpdate(page.id, prop.id, v)}
        onClose={() => { onStopEditing(); tableRef.current?.focus(); }} />
    );
  }
  if (relatedIds.length === 0) return <span className="text-ink-muted text-sm">Empty</span>;
  const storePages = useDatabaseStore.getState().pages;
  return (
    <div className={`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
      {relatedIds.map(rid => {
        const relPage = storePages[rid];
        if (!relPage) return null;
        const relDb = useDatabaseStore.getState().databases[relPage.databaseId];
        const titlePropId = relDb?.titlePropertyId;
        const title = titlePropId ? relPage.properties[titlePropId] : relPage.id;
        return (
          <button key={rid} onClick={e => { e.stopPropagation(); onOpenPage(rid); }}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-tertiary hover:bg-hover-surface3 text-xs text-ink-body font-medium shrink-0 max-w-[140px]">
            <ArrowUpRight className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{title || 'Untitled'}</span>
          </button>
        );
      })}
    </div>
  );
}

function renderAssignedTo(value: any, wrapContent: boolean): React.ReactNode {
  const assignees: string[] = Array.isArray(value) ? value : (value ? [value] : []);
  if (assignees.length === 0) return <span className="text-ink-muted text-sm">Unassigned</span>;
  return (
    <div className={`flex items-center ${wrapContent ? 'flex-wrap gap-1' : '-space-x-1.5'}`}>
      {assignees.map((name, i) => (
        <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-gradient-violet2-from to-gradient-violet2-to text-ink-inverse flex items-center justify-center text-[10px] font-bold border-2 border-surface-primary shrink-0" title={name}>
          {String(name).charAt(0).toUpperCase()}
        </div>
      ))}
      {!wrapContent && assignees.length > 1 && <span className="text-xs text-ink-secondary ml-2">{assignees.length} assigned</span>}
    </div>
  );
}

function renderDueDate(p: CellRendererProps): React.ReactNode {
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

function renderDueDateBadge(dateVal: Date): React.ReactNode {
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

function renderCustom(p: CellRendererProps): React.ReactNode {
  const { page, prop, value, isEditing, onUpdate, onStopEditing, tableRef } = p;
  const dt = prop.customConfig?.dataType || 'string';
  if (isEditing) return renderCustomEditor(dt, value, v => onUpdate(page.id, prop.id, v), onStopEditing, tableRef);
  return renderCustomDisplay(dt, value);
}

function renderCustomEditor(dt: string, value: any, onChange: (v: any) => void, onStop: () => void, tableRef: React.RefObject<HTMLDivElement | null>): React.ReactNode {
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

function renderCustomDisplay(dt: string, value: any): React.ReactNode {
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

function renderTimestamp(prop: SchemaProperty, page: Page): React.ReactNode {
  const timeVal = prop.type === 'created_time' ? page.createdAt : page.updatedAt;
  return <div className="text-sm text-ink-secondary truncate whitespace-nowrap">{timeVal ? new Date(timeVal).toLocaleString() : '—'}</div>;
}

function renderUserMeta(prop: SchemaProperty, page: Page): React.ReactNode {
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

// ═══════════════════════════════════════════════════════════════════════════════
// Main dispatcher
// ═══════════════════════════════════════════════════════════════════════════════

export function renderCellContent(props: CellRendererProps): React.ReactNode {
  const { prop, value, page, wrapContent } = props;
  switch (prop.type) {
    case 'title':
    case 'text':            return renderTitleOrText(props);
    case 'number':          return renderNumber(props);
    case 'select':          return renderSelect(props);
    case 'status':          return renderStatus(props);
    case 'multi_select':    return renderMultiSelect(props);
    case 'date':            return renderDate(props);
    case 'checkbox':        return renderCheckbox(value);
    case 'person':
    case 'user':            return renderPerson(props);
    case 'email':
    case 'url':
    case 'phone':           return renderEmailUrlPhone(props);
    case 'place':           return renderPlace(props);
    case 'id':              return renderId(value);
    case 'files_media':     return renderFilesMedia(value);
    case 'button':          return renderButton(prop);
    case 'formula':         return renderFormula(props);
    case 'rollup':          return renderRollup(props);
    case 'relation':        return renderRelation(props);
    case 'assigned_to':     return renderAssignedTo(value, wrapContent);
    case 'due_date':        return renderDueDate(props);
    case 'custom':          return renderCustom(props);
    case 'created_time':
    case 'last_edited_time': return renderTimestamp(prop, page);
    case 'created_by':
    case 'last_edited_by':  return renderUserMeta(prop, page);
    default:                return <span className="text-sm text-ink-secondary truncate block">{String(value || '')}</span>;
  }
}
