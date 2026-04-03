/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterValueEditors.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:15 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { needsValue, DATE_PRESETS } from './constants';
import { PortalDropdown } from './PortalDropdown';
import { FilterEditorShell } from './FilterEditorShell';
import type { FilterValueEditorProps } from './FilterEditorShell';
import { cn } from '../../utils/cn';

function SelectFilterValueEditor(props: Readonly<FilterValueEditorProps>) {
  const { property, operator, value, onOperatorChange, onValueChange, onDelete } = props;
  const [search, setSearch] = useState('');
  const options = property.options || [];
  let selectedIds: string[];
  if (Array.isArray(value)) selectedIds = value;
  else if (value) selectedIds = [value];
  else selectedIds = [];
  const filtered = options.filter(o => o.value.toLowerCase().includes(search.toLowerCase()));

  const toggleOption = (optId: string) => {
    if (property.type === 'multi_select') {
      const next = selectedIds.includes(optId)
        ? selectedIds.filter(id => id !== optId)
        : [...selectedIds, optId];
      onValueChange(next);
    } else {
      onValueChange(optId === value ? '' : optId);
    }
  };

  return (
    <FilterEditorShell property={property} operator={operator} onOperatorChange={onOperatorChange} onDelete={onDelete}>
      {needsValue(operator) && (
        <div className={cn("px-2 pb-1")}>
          <div className={cn("flex items-center rounded-md border border-line bg-surface-secondary min-h-[28px] px-1.5")}>
            <input type="text"
              placeholder={property.type === 'multi_select' ? 'Select one or more options…' : 'Search for an option...'}
              value={search} onChange={e => setSearch(e.target.value)}
              className={cn("flex-1 bg-transparent text-sm outline-none placeholder-placeholder py-1")} autoFocus />
          </div>
        </div>
      )}
      {needsValue(operator) && (
        <div className={cn("overflow-y-auto flex-1 min-h-0 p-1")}>
          <div className={cn("flex flex-col gap-px")}>
            {filtered.map(opt => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <button key={opt.id} onClick={() => toggleOption(opt.id)}
                  className={cn(`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isSelected ? 'bg-surface-secondary' : 'hover:bg-hover-surface'
                  }`)}>
                  <div className={cn(`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                    isSelected ? 'bg-accent border-accent-border' : 'border-line-medium'
                  }`)}>
                    {isSelected && (
                      <svg className={cn("w-2.5 h-2.5 text-ink-inverse")} viewBox="0 0 16 16" fill="none">
                        <path d="M11.834 3.309a.625.625 0 0 1 1.072.642l-5.244 8.74a.625.625 0 0 1-1.01.085L3.155 8.699a.626.626 0 0 1 .95-.813l2.93 3.419z" fill="currentColor" />
                      </svg>
                    )}
                  </div>
                  <span className={cn("inline-flex items-center h-5 px-1.5 rounded text-sm truncate")}
                    style={{ background: opt.color?.split(' ')[0] || 'var(--color-chart-fill)', color: opt.color?.split(' ')[1] || 'var(--color-chart-axis)' }}>
                    {opt.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </FilterEditorShell>
  );
}

function DateFilterValueEditor(props: Readonly<FilterValueEditorProps>) {
  const { property, operator, value, onOperatorChange, onValueChange, onDelete } = props;
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const presetBtnRef = useRef<HTMLButtonElement>(null);

  const showDateInput = needsValue(operator) && operator !== 'is_relative_to_today';
  const isCustom = typeof value === 'string' && /^\d{4}-/.exec(value);
  const displayVal = isCustom ? value : (value || 'Custom date');

  const applyPreset = (preset: string) => {
    const today = new Date();
    let d: Date;
    switch (preset) {
      case 'Today': d = today; break;
      case 'Tomorrow': d = new Date(today.getTime() + 86400000); break;
      case 'Yesterday': d = new Date(today.getTime() - 86400000); break;
      case 'One week ago': d = new Date(today.getTime() - 7 * 86400000); break;
      case 'One week from now': d = new Date(today.getTime() + 7 * 86400000); break;
      case 'One month ago': d = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()); break;
      case 'One month from now': d = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()); break;
      default: return;
    }
    onValueChange(d.toISOString().slice(0, 10));
    setShowPresetMenu(false);
  };

  return (
    <FilterEditorShell property={property} operator={operator} onOperatorChange={onOperatorChange} onDelete={onDelete}>
      {showDateInput && (
        <div className={cn("p-2 flex flex-col gap-2")}>
          <button ref={presetBtnRef} onClick={() => setShowPresetMenu(true)}
            className={cn("flex items-center justify-between w-full h-8 px-2 border border-line rounded-lg text-sm text-ink-body hover:border-hover-border transition-colors")}>
            <span className={cn("truncate")}>{displayVal}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-ink-muted shrink-0")} />
          </button>
          <input type="date" value={isCustom ? value : ''} onChange={e => onValueChange(e.target.value)}
            className={cn("w-full h-8 px-2 border border-line rounded-lg text-sm bg-surface-primary")} />
          {operator === 'is_between' && (
            <input type="date"
              value={typeof value === 'object' && value?.end ? value.end : ''}
              onChange={e => onValueChange({ start: isCustom ? value : '', end: e.target.value })}
              className={cn("w-full h-8 px-2 border border-line rounded-lg text-sm bg-surface-primary")} />
          )}
        </div>
      )}
      {showPresetMenu && presetBtnRef.current && (
        <PortalDropdown anchorRef={presetBtnRef} onClose={() => setShowPresetMenu(false)} width={240}>
          <div className={cn("p-1 flex flex-col gap-px")}>
            {DATE_PRESETS.map(preset => (
              <button key={preset} onClick={() => applyPreset(preset)}
                className={cn(`w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                  displayVal === preset ? 'bg-surface-tertiary font-medium' : 'text-ink-body hover:bg-hover-surface'
                }`)}>{preset}</button>
            ))}
          </div>
        </PortalDropdown>
      )}
    </FilterEditorShell>
  );
}

function TextFilterValueEditor(props: Readonly<FilterValueEditorProps>) {
  const { property, operator, value, onOperatorChange, onValueChange, onDelete } = props;

  return (
    <FilterEditorShell property={property} operator={operator} onOperatorChange={onOperatorChange} onDelete={onDelete}>
      {needsValue(operator) && (
        <div className={cn("p-2")}>
          <input type={property.type === 'number' ? 'number' : 'text'} placeholder="Value"
            value={value || ''}
            onChange={e => onValueChange(property.type === 'number' && e.target.value ? Number(e.target.value) : e.target.value)}
            className={cn("w-full h-8 px-2 border border-line rounded-lg text-sm bg-surface-primary outline-none focus:border-focus-border-soft transition-colors")}
            autoFocus />
        </div>
      )}
    </FilterEditorShell>
  );
}

export type { FilterValueEditorProps } from './FilterEditorShell';

/** Dispatches to the appropriate filter value editor based on property type. */
export function FilterValueEditor(props: Readonly<FilterValueEditorProps>) {
  const t = props.property.type;
  if (t === 'select' || t === 'multi_select' || t === 'status') return <SelectFilterValueEditor {...props} />;
  if (t === 'date' || t === 'due_date' || t === 'created_time' || t === 'last_edited_time') return <DateFilterValueEditor {...props} />;
  return <TextFilterValueEditor {...props} />;
}
