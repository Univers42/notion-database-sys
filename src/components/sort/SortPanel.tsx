/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SortPanel.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:55 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Plus, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import type { SchemaProperty, DatabaseSchema, ViewConfig, Sort } from '../../types/database';
import { cn } from '../../utils/cn';

/** CSS class overrides for SortPanel sub-elements. */
export type SortPanelSlots = {
  root: string;
  header: string;
  title: string;
  clearButton: string;
  sortRow: string;
  select: string;
  dirButton: string;
  removeButton: string;
  addButton: string;
};

/** Renders a portal-based sort management panel below the filter bar. */
export function SortPanel({ database, view, slots }: Readonly<{ database: DatabaseSchema; view: ViewConfig; slots?: Partial<SortPanelSlots> }>) {
  const { addSort, updateSort, removeSort, clearSorts } = useStoreApi().getState();
  const allProps = Object.values(database.properties) as SchemaProperty[];
  const sorts = view.sorts || [];

  return (
    <div className={cn("p-3 flex flex-col gap-2", slots?.root)}>
      <div className={cn("flex items-center justify-between mb-1", slots?.header)}>
        <span className={cn("text-sm font-semibold text-ink-body", slots?.title)}>Sorts</span>
        {sorts.length > 0 && (
          <button onClick={() => clearSorts(view.id)} className={cn("text-xs text-danger-text-soft hover:text-hover-danger-text-bold", slots?.clearButton)}>Clear all</button>
        )}
      </div>
      {sorts.map((sort: Sort) => (
        <div key={sort.id} className={cn("flex items-center gap-2 text-sm", slots?.sortRow)}>
          <select value={sort.propertyId}
            onChange={e => updateSort(view.id, sort.id, { propertyId: e.target.value })}
            className={cn("px-2 py-1.5 border border-line rounded-lg bg-surface-primary text-sm flex-1", slots?.select)}>
            {allProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => updateSort(view.id, sort.id, { direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
            className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-lg text-sm transition-colors hover:bg-hover-surface ${
              sort.direction === 'asc' ? 'text-accent-text-light' : 'text-purple-text'
            }`, slots?.dirButton)}>
            {sort.direction === 'asc' ? <ArrowUp className={cn("w-3.5 h-3.5")} /> : <ArrowDown className={cn("w-3.5 h-3.5")} />}
            {sort.direction === 'asc' ? 'Ascending' : 'Descending'}
          </button>
          <button onClick={() => removeSort(view.id, sort.id)}
            className={cn("p-1 text-ink-muted hover:text-hover-danger-text rounded hover:bg-hover-surface transition-colors shrink-0", slots?.removeButton)}>
            <X className={cn("w-3.5 h-3.5")} />
          </button>
        </div>
      ))}
      <button onClick={() => { const firstProp = allProps[0]; if (firstProp) addSort(view.id, { propertyId: firstProp.id, direction: 'asc' }); }}
        className={cn("flex items-center gap-1.5 text-sm text-accent-text-soft hover:text-hover-accent-text py-1 transition-colors", slots?.addButton)}>
        <Plus className={cn("w-3.5 h-3.5")} /> Add sort
      </button>
    </div>
  );
}
