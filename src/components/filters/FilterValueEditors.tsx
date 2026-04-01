// ═══════════════════════════════════════════════════════════════════════════════
// Filter value editors — dispatches to type-specific editors
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import { ChevronDown, MoreHorizontal, Trash2, Filter } from 'lucide-react';
import type { FilterOperator, SchemaProperty } from '../../types/database';
import { getOperatorsForType, needsValue, DATE_PRESETS } from './constants';
import { PortalDropdown } from './PortalDropdown';

// ─── Shared operator picker ──────────────────────────────────────────────────

function FilterOperatorPicker({ type, current, onSelect, onClose }: {
  type: string; current: FilterOperator;
  onSelect: (op: FilterOperator) => void; onClose: () => void;
}) {
  return (
    <div className="flex flex-col py-1" style={{ width: 190, maxHeight: '70vh' }}>
      <div className="overflow-y-auto flex-1 p-1">
        <div className="flex flex-col gap-px">
          {getOperatorsForType(type).map(op => (
            <button key={op.value} onClick={() => { onSelect(op.value); onClose(); }}
              className={`w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                current === op.value ? 'bg-surface-tertiary font-medium text-ink-strong' : 'text-ink-body hover:bg-hover-surface'
              }`}>{op.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shared editor shell ─────────────────────────────────────────────────────

interface EditorShellProps {
  property: SchemaProperty;
  operator: FilterOperator;
  onOperatorChange: (op: FilterOperator) => void;
  onDelete: () => void;
  children: React.ReactNode;
}

function FilterEditorShell({ property, operator, onOperatorChange, onDelete, children }: EditorShellProps) {
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const operatorBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const opDisplay = getOperatorsForType(property.type).find(o => o.value === operator)?.label || 'is';

  return (
    <div className="flex flex-col" style={{ width: 260, maxHeight: '50vh' }}>
      {/* Header: property name + operator + ··· */}
      <div className="flex items-center gap-1 px-2 pt-1 pb-0.5 text-xs text-ink-muted shrink-0">
        <span className="truncate flex-shrink">{property.name}</span>
        <button ref={operatorBtnRef} onClick={() => setShowOperatorMenu(true)}
          className="flex items-center gap-0.5 px-1 py-0.5 rounded text-xs text-ink-secondary font-medium hover:bg-hover-surface2 shrink-0">
          {opDisplay.toLowerCase()} <ChevronDown className="w-2.5 h-2.5" />
        </button>
        <div className="flex-1" />
        <button ref={moreBtnRef} onClick={() => setShowMoreMenu(true)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 text-ink-muted shrink-0">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {children}

      {showOperatorMenu && operatorBtnRef.current && (
        <PortalDropdown anchorRef={operatorBtnRef} onClose={() => setShowOperatorMenu(false)} width={190}>
          <FilterOperatorPicker type={property.type} current={operator}
            onSelect={onOperatorChange} onClose={() => setShowOperatorMenu(false)} />
        </PortalDropdown>
      )}
      {showMoreMenu && moreBtnRef.current && (
        <PortalDropdown anchorRef={moreBtnRef} onClose={() => setShowMoreMenu(false)} width={220}>
          <div className="p-1 flex flex-col gap-px">
            <button onClick={() => { onDelete(); setShowMoreMenu(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-danger-text hover:bg-hover-danger transition-colors">
              <Trash2 className="w-4 h-4" /> Delete filter
            </button>
            <button onClick={() => setShowMoreMenu(false)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <Filter className="w-4 h-4" /> Add to advanced filter
            </button>
          </div>
        </PortalDropdown>
      )}
    </div>
  );
}

// ─── Select / MultiSelect editor ─────────────────────────────────────────────

function SelectFilterValueEditor(props: FilterValueEditorProps) {
  const { property, operator, value, onOperatorChange, onValueChange, onDelete } = props;
  const [search, setSearch] = useState('');
  const options = property.options || [];
  const selectedIds: string[] = Array.isArray(value) ? value : (value ? [value] : []);
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
        <div className="px-2 pb-1">
          <div className="flex items-center rounded-md border border-line bg-surface-secondary min-h-[28px] px-1.5">
            <input type="text"
              placeholder={property.type === 'multi_select' ? 'Select one or more options…' : 'Search for an option...'}
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder-placeholder py-1" autoFocus />
          </div>
        </div>
      )}
      {needsValue(operator) && (
        <div className="overflow-y-auto flex-1 min-h-0 p-1">
          <div className="flex flex-col gap-px">
            {filtered.map(opt => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <button key={opt.id} onClick={() => toggleOption(opt.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isSelected ? 'bg-surface-secondary' : 'hover:bg-hover-surface'
                  }`}>
                  <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                    isSelected ? 'bg-accent border-accent-border' : 'border-line-medium'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-ink-inverse" viewBox="0 0 16 16" fill="none">
                        <path d="M11.834 3.309a.625.625 0 0 1 1.072.642l-5.244 8.74a.625.625 0 0 1-1.01.085L3.155 8.699a.626.626 0 0 1 .95-.813l2.93 3.419z" fill="currentColor" />
                      </svg>
                    )}
                  </div>
                  <span className="inline-flex items-center h-5 px-1.5 rounded text-sm truncate"
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

// ─── Date editor ──────────────────────────────────────────────────────────────

function DateFilterValueEditor(props: FilterValueEditorProps) {
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
        <div className="p-2 flex flex-col gap-2">
          <button ref={presetBtnRef} onClick={() => setShowPresetMenu(true)}
            className="flex items-center justify-between w-full h-8 px-2 border border-line rounded-lg text-sm text-ink-body hover:border-hover-border transition-colors">
            <span className="truncate">{displayVal}</span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted shrink-0" />
          </button>
          <input type="date" value={isCustom ? value : ''} onChange={e => onValueChange(e.target.value)}
            className="w-full h-8 px-2 border border-line rounded-lg text-sm bg-surface-primary" />
          {operator === 'is_between' && (
            <input type="date"
              value={typeof value === 'object' && value?.end ? value.end : ''}
              onChange={e => onValueChange({ start: isCustom ? value : '', end: e.target.value })}
              className="w-full h-8 px-2 border border-line rounded-lg text-sm bg-surface-primary" />
          )}
        </div>
      )}
      {showPresetMenu && presetBtnRef.current && (
        <PortalDropdown anchorRef={presetBtnRef} onClose={() => setShowPresetMenu(false)} width={240}>
          <div className="p-1 flex flex-col gap-px">
            {DATE_PRESETS.map(preset => (
              <button key={preset} onClick={() => applyPreset(preset)}
                className={`w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                  displayVal === preset ? 'bg-surface-tertiary font-medium' : 'text-ink-body hover:bg-hover-surface'
                }`}>{preset}</button>
            ))}
          </div>
        </PortalDropdown>
      )}
    </FilterEditorShell>
  );
}

// ─── Text / Number editor ─────────────────────────────────────────────────────

function TextFilterValueEditor(props: FilterValueEditorProps) {
  const { property, operator, value, onOperatorChange, onValueChange, onDelete } = props;

  return (
    <FilterEditorShell property={property} operator={operator} onOperatorChange={onOperatorChange} onDelete={onDelete}>
      {needsValue(operator) && (
        <div className="p-2">
          <input type={property.type === 'number' ? 'number' : 'text'} placeholder="Value"
            value={value || ''}
            onChange={e => onValueChange(property.type === 'number' && e.target.value ? Number(e.target.value) : e.target.value)}
            className="w-full h-8 px-2 border border-line rounded-lg text-sm bg-surface-primary outline-none focus:border-focus-border-soft transition-colors"
            autoFocus />
        </div>
      )}
    </FilterEditorShell>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export interface FilterValueEditorProps {
  property: SchemaProperty;
  operator: FilterOperator;
  value: any;
  onOperatorChange: (op: FilterOperator) => void;
  onValueChange: (val: any) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FilterValueEditor(props: FilterValueEditorProps) {
  const t = props.property.type;
  if (t === 'select' || t === 'multi_select' || t === 'status') return <SelectFilterValueEditor {...props} />;
  if (t === 'date' || t === 'due_date' || t === 'created_time' || t === 'last_edited_time') return <DateFilterValueEditor {...props} />;
  return <TextFilterValueEditor {...props} />;
}
