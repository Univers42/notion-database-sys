/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AdvancedFilterGridHelpers.tsx                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { FilterOperator, SchemaProperty, PropertyValue } from '../../types/database';
import { getOperatorsForType } from './constants';
import { cn } from '../../utils/cn';

export function FilterOperatorPicker({ type, current, onSelect, onClose }: Readonly<{
  type: string; current: FilterOperator;
  onSelect: (op: FilterOperator) => void; onClose: () => void;
}>) {
  return (
    <div className={cn("flex flex-col py-1")} style={{ width: 190, maxHeight: '70vh' }}>
      <div className={cn("overflow-y-auto flex-1 p-1")}>
        <div className={cn("flex flex-col gap-px")}>
          {getOperatorsForType(type).map(op => (
            <button key={op.value} onClick={() => { onSelect(op.value); onClose(); }}
              className={cn(`w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                current === op.value ? 'bg-surface-tertiary font-medium text-ink-strong' : 'text-ink-body hover:bg-hover-surface'
              }`)}>{op.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function renderInlineFilterValue(
  prop: SchemaProperty,
  filter: { id: string; operator: FilterOperator; value: PropertyValue },
  onUpdateFilter: (id: string, updates: Partial<{ value: PropertyValue }>) => void,
) {
  if (prop.type === 'select' || prop.type === 'multi_select' || prop.type === 'status') {
    return (
      <div className={cn("h-8 px-2 flex items-center border border-line rounded-lg text-sm text-ink-secondary truncate")}>
        {filter.value ? (prop.options?.find(o => o.id === filter.value)?.value || filter.value) : 'Select...'}
      </div>
    );
  }
  if (prop.type === 'date' || prop.type === 'due_date') {
    return (
      <input type="date" value={filter.value || ''}
        onChange={e => onUpdateFilter(filter.id, { value: e.target.value })}
        className={cn("h-8 px-2 border border-line rounded-lg text-sm w-full bg-surface-primary")} />
    );
  }
  return (
    <input type={prop.type === 'number' ? 'number' : 'text'} placeholder="Value"
      value={filter.value || ''}
      onChange={e => onUpdateFilter(filter.id, { value: prop.type === 'number' && e.target.value ? Number(e.target.value) : e.target.value })}
      className={cn("h-8 px-2 border border-line rounded-lg text-sm w-full bg-surface-primary outline-none focus:border-focus-border-soft transition-colors")} />
  );
}

export function getFilterLabel(idx: number, conjunction: string): string {
  if (idx === 0) return 'Where';
  if (conjunction === 'or') return 'Or';
  return 'And';
}
