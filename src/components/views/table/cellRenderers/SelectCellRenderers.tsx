/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SelectCellRenderers.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:37:46 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { CellRendererProps } from '../CellRenderer';
import { SelectEditor, MultiSelectEditor } from '../SelectEditors';
import { StatusCellEditor } from '../../../cellEditors';
import { cn } from '../../../../utils/cn';

export function renderSelect(p: CellRendererProps): React.ReactNode {
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
    ? <div className={cn("flex items-center gap-1.5")}><span className={cn(`inline-block px-2 py-0.5 rounded text-xs font-medium ${selOpt.color}`)}>{selOpt.value}</span></div>
    : <span className={cn("text-ink-muted text-sm")}>Empty</span>;
}

export function renderStatus(p: CellRendererProps): React.ReactNode {
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
    ? <div className={cn("flex items-center gap-1.5")}><span className={cn(`w-2 h-2 rounded-full ${statusOpt.color.split(' ')[0]}`)} /><span className={cn(`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusOpt.color}`)}>{statusOpt.value}</span></div>
    : <span className={cn("text-ink-muted text-sm")}>Empty</span>;
}

export function renderMultiSelect(p: CellRendererProps): React.ReactNode {
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
    <div className={cn(`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`)}>
      {msIds.length > 0 ? msIds.map(id => {
        const opt = prop.options?.find(o => o.id === id);
        return opt ? <span key={id} className={cn(`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${opt.color}`)}>{opt.value}</span> : null;
      }) : <span className={cn("text-ink-muted text-sm")}>Empty</span>}
    </div>
  );
}
