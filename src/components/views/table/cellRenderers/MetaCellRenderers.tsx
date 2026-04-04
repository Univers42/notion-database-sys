/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MetaCellRenderers.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 10:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { CellRendererProps } from '../CellRenderer';
import type { SchemaProperty, Page, PropertyValue } from '../../../../types/database';
import { CheckCircle2, MapPin } from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { safeString } from '../../../../utils/safeString';
import { InlineInput } from './InlineInput';

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
