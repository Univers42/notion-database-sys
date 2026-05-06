/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RelationCellRenderers.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { CellRendererProps } from '../CellRenderer';
import type { PropertyValue } from '../../../../types/database';
import { RelationCellEditor } from '../../../cellEditors/index';
import { ArrowUpRight, Sigma } from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { safeString } from '../../../../utils/safeString';

function formatBoolish(v: PropertyValue): string {
  if (v === true) return '✓';
  if (v === false) return '✗';
  return safeString(v) || '—';
}

function getRingStroke(pct: number): string {
  if (pct >= 80) return 'var(--color-progress-high)';
  if (pct >= 50) return 'var(--color-chart-1)';
  if (pct >= 25) return 'var(--color-chart-4)';
  return 'var(--color-chart-7)';
}

function toStringArray(value: PropertyValue): string[] {
  if (Array.isArray(value)) return value;
  if (value) return [value] as string[];
  return [];
}

/** Renders a formula cell with computed value and click-to-edit. */
export function renderFormula(p: CellRendererProps): React.ReactNode {
  const { prop, page, databaseId, onFormulaEdit } = p;
  const resolveFormula = p.storeApi.getState().resolveFormula;
  const formulaResult = prop.formulaConfig
    ? resolveFormula(databaseId, page, prop.formulaConfig.expression)
    : '#N/A';
  const hasValue = formulaResult != null && formulaResult !== '' && formulaResult !== '#ERROR';
  let formulaDisplay: React.ReactNode;
  if (hasValue) {
    formulaDisplay = typeof formulaResult === 'number' ? formulaResult.toLocaleString() : safeString(formulaResult);
  } else {
    formulaDisplay = <span className={cn("text-danger-text-faint")}>{formulaResult === '#ERROR' ? '#ERROR' : 'Empty'}</span>;
  }

  return (
    <button type="button" className={cn("text-sm text-ink-body tabular-nums truncate font-mono cursor-pointer group/formula text-left")}
      onClick={e => { e.stopPropagation(); onFormulaEdit(prop.id); }}
      title="Click to edit formula">
      <div className={cn("flex items-center gap-1.5")}>
        <span className={cn("truncate")}>
          {formulaDisplay}
        </span>
        <Sigma className={cn("w-3 h-3 text-ink-disabled opacity-0 group-hover/formula:opacity-100 shrink-0")} />
      </div>
    </button>
  );
}

/** Renders a rollup cell, dispatching to array, bar, or ring display modes. */
export function renderRollup(p: CellRendererProps): React.ReactNode {
  const { prop, page, databaseId, wrapContent } = p;
  const resolveRollup = p.storeApi.getState().resolveRollup;
  const rollupResult = resolveRollup(databaseId, page, prop.id);
  const displayAs = prop.rollupConfig?.displayAs || 'number';

  if (rollupResult == null) return <span className={cn("text-ink-muted text-sm")}>—</span>;

  if (Array.isArray(rollupResult)) return renderRollupArray(rollupResult, wrapContent);
  if (displayAs === 'bar' && typeof rollupResult === 'number') return renderRollupBar(rollupResult);
  if (displayAs === 'ring' && typeof rollupResult === 'number') return renderRollupRing(rollupResult);
  return (
    <div className={cn("text-sm text-ink-body tabular-nums truncate font-mono")}>
      {typeof rollupResult === 'number' ? rollupResult.toLocaleString() : safeString(rollupResult)}
    </div>
  );
}

/** Renders a rollup result as a row of inline tags. */
export function renderRollupArray(arr: PropertyValue[], wrapContent: boolean): React.ReactNode {
  if (arr.length === 0) return <span className={cn("text-ink-muted text-sm")}>Empty</span>;
  return (
    <div className={cn(`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`)}>
      {arr.map((v, idx) => ({ v, _key: `rv-${idx}-${safeString(v)}` })).map(({ v, _key }) => (
        <span key={_key} className={cn("inline-flex items-center px-1.5 py-0.5 rounded bg-surface-tertiary text-xs text-ink-body-light font-medium shrink-0 max-w-[120px] truncate")}>
          {formatBoolish(v)}
        </span>
      ))}
    </div>
  );
}

/** Renders a rollup number as a horizontal progress bar. */
export function renderRollupBar(value: number): React.ReactNode {
  const pct = Math.min(100, Math.max(0, (value / 15) * 100));
  return (
    <div className={cn("flex items-center gap-2")}>
      <div className={cn("flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden min-w-[40px]")}>
        <div className={cn("h-full bg-accent rounded-full")} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-xs text-ink-secondary tabular-nums shrink-0")}>{value}</span>
    </div>
  );
}

/** Renders a rollup percentage as an SVG ring chart. */
export function renderRollupRing(value: number): React.ReactNode {
  const pct = Math.min(100, Math.max(0, value));
  const r = 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const stroke = getRingStroke(pct);
  return (
    <div className={cn("flex items-center gap-2")}>
      <svg width="22" height="22" className={cn("shrink-0 -rotate-90")}>
        <circle cx="11" cy="11" r={r} fill="none" stroke="var(--color-chart-grid)" strokeWidth="3" />
        <circle cx="11" cy="11" r={r} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <span className={cn("text-xs text-ink-body-light tabular-nums")}>{pct}%</span>
    </div>
  );
}

/** Renders a relation cell with linked page chips and inline editor. */
export function renderRelation(p: CellRendererProps): React.ReactNode {
  const { prop, page, value, isEditing, wrapContent, databaseId, onUpdate, onStopEditing, onOpenPage, tableRef } = p;
  const relatedIds: string[] = Array.isArray(value) ? value : [];
  if (isEditing) {
    return (
      <RelationCellEditor property={prop} value={value} pageId={page.id} databaseId={databaseId}
        onUpdate={v => onUpdate(page.id, prop.id, v)}
        onClose={() => { onStopEditing(); tableRef.current?.focus(); }} />
    );
  }
  if (relatedIds.length === 0) return <span className={cn("text-ink-muted text-sm")}>Empty</span>;
  const store = p.storeApi.getState();
  const storePages = store.pages;
  return (
    <div className={cn(`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`)}>
      {relatedIds.map(rid => {
        const relPage = storePages[rid];
        if (!relPage) return null;
        const relDb = store.databases[relPage.databaseId];
        const titlePropId = relDb?.titlePropertyId;
        const title = titlePropId ? relPage.properties[titlePropId] : relPage.id;
        return (
          <button key={rid} onClick={e => { e.stopPropagation(); onOpenPage(rid); }}
            className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-tertiary hover:bg-hover-surface3 text-xs text-ink-body font-medium shrink-0 max-w-[140px]")}>
            <ArrowUpRight className={cn("w-2.5 h-2.5 shrink-0")} /><span className={cn("truncate")}>{title || 'Untitled'}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Renders assigned-to avatars, stacked or wrapped based on content setting. */
export function renderAssignedTo(value: PropertyValue, wrapContent: boolean): React.ReactNode {
  const assignees: string[] = toStringArray(value);
  if (assignees.length === 0) return <span className={cn("text-ink-muted text-sm")}>Unassigned</span>;
  return (
    <div className={cn(`flex items-center ${wrapContent ? 'flex-wrap gap-1' : '-space-x-1.5'}`)}>
      {assignees.map((name) => (
        <div key={name} className={cn("w-6 h-6 rounded-full bg-gradient-to-br from-gradient-violet2-from to-gradient-violet2-to text-ink-inverse flex items-center justify-center text-[10px] font-bold border-2 border-surface-primary shrink-0")} title={name}>
          {String(name).charAt(0).toUpperCase()}
        </div>
      ))}
      {!wrapContent && assignees.length > 1 && <span className={cn("text-xs text-ink-secondary ml-2")}>{assignees.length} assigned</span>}
    </div>
  );
}
