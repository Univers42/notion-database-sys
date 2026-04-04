/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TextCellRenderers.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 10:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { CellRendererProps } from '../CellRenderer';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { InlineInput } from './InlineInput';

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
