/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardFilterBar.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardFilterBar — Notion "filter multiple sources" chips ────────────
// Simple property filters only (no AND/OR groups — Notion's documented limit).
// Filters target properties by NAME + TYPE so they span widgets/sources.

import React, { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useOutsideClick } from '../../../../hooks/useOutsideClick';
import { getOperatorsForType, needsValue } from '../../../filters/constants';
import type { DashboardGlobalFilter, SchemaProperty, FilterOperator } from '../../../../types/database';
import { cn } from '../../../../utils/cn';

/** One editable filter chip: property · operator · value. */
function FilterChip({ filter, onChange, onRemove }: Readonly<{
  filter: DashboardGlobalFilter;
  onChange: (next: DashboardGlobalFilter) => void;
  onRemove: () => void;
}>) {
  const operators = getOperatorsForType(filter.propertyType);
  return (
    <span className={cn("inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border border-line bg-surface-secondary text-xs text-ink-body")}>
      <span className={cn("font-medium")}>{filter.propertyName}</span>
      <select value={filter.operator}
        onChange={e => onChange({ ...filter, operator: e.target.value as FilterOperator })}
        className={cn("bg-transparent text-xs text-ink-secondary focus:outline-none cursor-pointer")}>
        {operators.map((op: { value: string; label: string }) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
      {needsValue(filter.operator) && (
        <input value={String(filter.value ?? '')}
          onChange={e => onChange({ ...filter, value: e.target.value })}
          placeholder="value"
          className={cn("w-20 bg-transparent text-xs focus:outline-none border-b border-transparent focus:border-line")} />
      )}
      <button onClick={onRemove} aria-label={`Remove ${filter.propertyName} filter`}
        className={cn("p-0.5 rounded-full hover:bg-hover-surface text-ink-muted")}>
        <X className={cn("w-3 h-3")} />
      </button>
    </span>
  );
}

/** The bar: active chips + "Add filter" property picker. */
export function DashboardFilterBar({ filters, properties, onChange }: Readonly<{
  filters: DashboardGlobalFilter[];
  properties: SchemaProperty[];
  onChange: (filters: DashboardGlobalFilter[]) => void;
}>) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(pickerRef, pickerOpen, () => setPickerOpen(false));

  const addFilter = (prop: SchemaProperty) => {
    const ops = getOperatorsForType(prop.type);
    onChange([...filters, {
      id: crypto.randomUUID(),
      propertyName: prop.name,
      propertyType: prop.type,
      operator: ops[0].value as FilterOperator,
      value: '',
    }]);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 px-4 py-1.5 border-b border-line bg-surface-primary")}>
      {filters.map(filter => (
        <FilterChip key={filter.id} filter={filter}
          onChange={next => onChange(filters.map(f => f.id === next.id ? next : f))}
          onRemove={() => onChange(filters.filter(f => f.id !== filter.id))} />
      ))}
      <div ref={pickerRef} className={cn("relative")}>
        <button onClick={() => setPickerOpen(o => !o)}
          className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full text-ink-muted hover:bg-hover-surface transition-colors")}>
          <Plus className={cn("w-3 h-3")} /> Add filter
        </button>
        {pickerOpen && (
          <div className={cn("absolute left-0 top-full mt-1 z-30 w-52 max-h-72 overflow-auto py-1 rounded-lg border border-line bg-surface-primary shadow-lg")}>
            <div className={cn("px-3 py-1 text-[11px] text-ink-secondary select-none")}>Filter multiple sources by…</div>
            {properties.map(prop => (
              <button key={prop.id} onClick={() => { addFilter(prop); setPickerOpen(false); }}
                className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-ink-body hover:bg-hover-surface-soft2 transition-colors")}>
                <span className={cn("truncate flex-1")}>{prop.name}</span>
                <span className={cn("text-[10px] text-ink-disabled")}>{prop.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
