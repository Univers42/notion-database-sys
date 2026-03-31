import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Type, Hash, List, Tag, CircleDot, Calendar, CheckSquare, Users,
  Mail, Phone, Link, FileText, MapPin, Fingerprint, MousePointerClick,
  Clock, User, Sigma, GitBranch, ExternalLink,
  Database, ChevronDown, Plus, X, GripVertical, Trash2, MoreHorizontal,
  Filter,
} from 'lucide-react';
import type { FilterOperator, SchemaProperty } from '../types/database';


// ═══════════════════════════════════════════════════════════════════════════════
// SHARED FILTER CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const FILTER_OPERATORS: Record<string, { label: string; value: FilterOperator }[]> = {
  text: [
    { label: 'Contains', value: 'contains' }, { label: 'Does not contain', value: 'not_contains' },
    { label: 'Equals', value: 'equals' }, { label: 'Not equals', value: 'not_equals' },
    { label: 'Starts with', value: 'starts_with' }, { label: 'Ends with', value: 'ends_with' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  title: [
    { label: 'Contains', value: 'contains' }, { label: 'Does not contain', value: 'not_contains' },
    { label: 'Equals', value: 'equals' }, { label: 'Is empty', value: 'is_empty' },
    { label: 'Is not empty', value: 'is_not_empty' },
  ],
  number: [
    { label: '=', value: 'equals' }, { label: '≠', value: 'not_equals' },
    { label: '>', value: 'greater_than' }, { label: '<', value: 'less_than' },
    { label: '≥', value: 'greater_than_or_equal' }, { label: '≤', value: 'less_than_or_equal' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  select: [
    { label: 'Is', value: 'equals' }, { label: 'Is not', value: 'not_equals' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  status: [
    { label: 'Is', value: 'equals' }, { label: 'Is not', value: 'not_equals' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  multi_select: [
    { label: 'Contains', value: 'contains' }, { label: 'Does not contain', value: 'not_contains' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  date: [
    { label: 'Is', value: 'equals' }, { label: 'Is before', value: 'is_before' },
    { label: 'Is after', value: 'is_after' },
    { label: 'Is on or before', value: 'is_on_or_before' }, { label: 'Is on or after', value: 'is_on_or_after' },
    { label: 'Is between', value: 'is_between' }, { label: 'Is relative to today', value: 'is_relative_to_today' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  checkbox: [
    { label: 'Is checked', value: 'is_checked' }, { label: 'Is not checked', value: 'is_not_checked' },
  ],
  user: [
    { label: 'Is', value: 'equals' }, { label: 'Is not', value: 'not_equals' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  person: [
    { label: 'Is', value: 'equals' }, { label: 'Is not', value: 'not_equals' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  url: [
    { label: 'Equals', value: 'equals' }, { label: 'Contains', value: 'contains' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  email: [
    { label: 'Equals', value: 'equals' }, { label: 'Contains', value: 'contains' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  phone: [
    { label: 'Equals', value: 'equals' }, { label: 'Is empty', value: 'is_empty' },
  ],
  created_time: [
    { label: 'Is before', value: 'is_before' }, { label: 'Is after', value: 'is_after' },
    { label: 'Is on or before', value: 'is_on_or_before' }, { label: 'Is on or after', value: 'is_on_or_after' },
  ],
  last_edited_time: [
    { label: 'Is before', value: 'is_before' }, { label: 'Is after', value: 'is_after' },
    { label: 'Is on or before', value: 'is_on_or_before' }, { label: 'Is on or after', value: 'is_on_or_after' },
  ],
};

export function getOperatorsForType(type: string) {
  return FILTER_OPERATORS[type] || FILTER_OPERATORS.text;
}

export function needsValue(op: FilterOperator) {
  return !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'is_relative_to_today'].includes(op);
}

const DATE_PRESETS = [
  'Today', 'Tomorrow', 'Yesterday', 'One week ago',
  'One week from now', 'One month ago', 'One month from now', 'Custom date',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY TYPE ICON — shared between filter components
// ═══════════════════════════════════════════════════════════════════════════════

export function PropertyTypeIcon({ type, className = 'w-4 h-4' }: { type: string; className?: string }) {
  switch (type) {
    case 'title': case 'text': return <Type className={className} />;
    case 'number': return <Hash className={className} />;
    case 'select': return <List className={className} />;
    case 'multi_select': return <Tag className={className} />;
    case 'status': return <CircleDot className={className} />;
    case 'date': case 'due_date': return <Calendar className={className} />;
    case 'checkbox': return <CheckSquare className={className} />;
    case 'person': case 'user': case 'assigned_to': return <Users className={className} />;
    case 'email': return <Mail className={className} />;
    case 'phone': return <Phone className={className} />;
    case 'url': return <Link className={className} />;
    case 'files_media': return <FileText className={className} />;
    case 'place': return <MapPin className={className} />;
    case 'id': return <Fingerprint className={className} />;
    case 'button': return <MousePointerClick className={className} />;
    case 'created_time': case 'last_edited_time': return <Clock className={className} />;
    case 'created_by': case 'last_edited_by': return <User className={className} />;
    case 'formula': return <Sigma className={className} />;
    case 'rollup': return <GitBranch className={className} />;
    case 'relation': return <ExternalLink className={className} />;
    case 'custom': return <Database className={className} />;
    default: return <Type className={className} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTAL DROPDOWN WRAPPER — Renders dropdown at body level to avoid clipping
// ═══════════════════════════════════════════════════════════════════════════════

function PortalDropdown({ anchorRef, children, onClose, width, align = 'left' }: {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
  align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: align === 'right' ? rect.right - (width || 220) : rect.left,
    });
  }, [anchorRef, width, align]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!pos) return null;

  return createPortal(
    <div ref={ref}
      className="fixed z-[9999] bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden"
      style={{ top: pos.top, left: pos.left, ...(width ? { width } : {}) }}>
      {children}
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER PROPERTY PICKER — Shared dropdown for choosing which property to filter
// ═══════════════════════════════════════════════════════════════════════════════

export function FilterPropertyPicker({ properties, onSelect, onClose, onAdvancedFilter, title = 'Add filter' }: {
  properties: SchemaProperty[];
  onSelect: (propId: string) => void;
  onClose: () => void;
  onAdvancedFilter?: () => void;
  title?: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col" style={{ minWidth: 290, maxWidth: 290, maxHeight: '80vh' }}>
      {/* Header with optional back/close */}
      {title && (
        <div className="flex items-center px-3 pt-3.5 pb-1.5 h-[42px] shrink-0">
          <span className="flex-1 font-semibold text-sm truncate">{title}</span>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-hover-surface2 text-ink-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-center rounded-md border border-line bg-surface-secondary h-7 px-1.5">
          <input
            type="text"
            placeholder="Filter by…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder-placeholder"
            autoFocus
          />
        </div>
      </div>

      {/* Property list */}
      <div className="overflow-y-auto flex-1 min-h-0 p-1">
        <div className="flex flex-col gap-px">
          {filtered.map(prop => (
            <button
              key={prop.id}
              onClick={() => onSelect(prop.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors"
            >
              <PropertyTypeIcon type={prop.type} className="w-4 h-4 text-ink-secondary shrink-0" />
              <span className="truncate">{prop.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-sm text-ink-muted text-center">No properties found</div>
          )}
        </div>
      </div>

      {/* Footer: advanced filter */}
      {onAdvancedFilter && (
        <div className="border-t border-line-light p-1 shrink-0">
          <button
            onClick={onAdvancedFilter}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add advanced filter</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER OPERATOR PICKER — Dropdown with operator choices for a property type
// ═══════════════════════════════════════════════════════════════════════════════

function FilterOperatorPicker({ type, current, onSelect, onClose }: {
  type: string;
  current: FilterOperator;
  onSelect: (op: FilterOperator) => void;
  onClose: () => void;
}) {
  const operators = getOperatorsForType(type);

  return (
    <div className="flex flex-col py-1" style={{ width: 190, maxHeight: '70vh' }}>
      <div className="overflow-y-auto flex-1 p-1">
        <div className="flex flex-col gap-px">
          {operators.map(op => (
            <button
              key={op.value}
              onClick={() => { onSelect(op.value); onClose(); }}
              className={`w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                current === op.value
                  ? 'bg-surface-tertiary font-medium text-ink-strong'
                  : 'text-ink-body hover:bg-hover-surface'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECT / MULTI-SELECT FILTER VALUE EDITOR — Checkbox list with colored tags
// ═══════════════════════════════════════════════════════════════════════════════

function SelectFilterValueEditor({ property, operator, value, onOperatorChange, onValueChange, onDelete, onClose }: {
  property: SchemaProperty;
  operator: FilterOperator;
  value: any;
  onOperatorChange: (op: FilterOperator) => void;
  onValueChange: (val: any) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const operatorBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const options = property.options || [];
  const selectedIds: string[] = Array.isArray(value) ? value : (() => value ? [value] : [])();
  const filtered = options.filter(o => o.value.toLowerCase().includes(search.toLowerCase()));

  const opDisplay = getOperatorsForType(property.type).find(o => o.value === operator)?.label || 'is';

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
    <div className="flex flex-col" style={{ width: 260, maxHeight: '50vh' }}>
      {/* Header: label + operator + ··· */}
      <div className="flex items-center gap-1 px-2 pt-1 pb-0.5 text-xs text-ink-muted shrink-0">
        <span className="truncate flex-shrink">{property.name}</span>
        <button
          ref={operatorBtnRef}
          onClick={() => setShowOperatorMenu(true)}
          className="flex items-center gap-0.5 px-1 py-0.5 rounded text-xs text-ink-secondary font-medium hover:bg-hover-surface2 shrink-0"
        >
          {opDisplay.toLowerCase()} <ChevronDown className="w-2.5 h-2.5" />
        </button>
        <div className="flex-1" />
        <button
          ref={moreBtnRef}
          onClick={() => setShowMoreMenu(true)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 text-ink-muted shrink-0"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search input */}
      {needsValue(operator) && (
        <div className="px-2 pb-1">
          <div className="flex items-center rounded-md border border-line bg-surface-secondary min-h-[28px] px-1.5">
            <input
              type="text"
              placeholder={property.type === 'multi_select' ? 'Select one or more options…' : 'Search for an option...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder-placeholder py-1"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Options list */}
      {needsValue(operator) && (
        <div className="overflow-y-auto flex-1 min-h-0 p-1">
          <div className="flex flex-col gap-px">
            {filtered.map(opt => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isSelected ? 'bg-surface-secondary' : 'hover:bg-hover-surface'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                    isSelected ? 'bg-accent border-accent-border' : 'border-line-medium'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-ink-inverse" viewBox="0 0 16 16" fill="none">
                        <path d="M11.834 3.309a.625.625 0 0 1 1.072.642l-5.244 8.74a.625.625 0 0 1-1.01.085L3.155 8.699a.626.626 0 0 1 .95-.813l2.93 3.419z" fill="currentColor" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="inline-flex items-center h-5 px-1.5 rounded text-sm truncate"
                    style={{ background: opt.color?.split(' ')[0] || 'var(--color-chart-fill)', color: opt.color?.split(' ')[1] || 'var(--color-chart-axis)' }}
                  >
                    {opt.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Operator dropdown portal */}
      {showOperatorMenu && operatorBtnRef.current && (
        <PortalDropdown anchorRef={operatorBtnRef} onClose={() => setShowOperatorMenu(false)} width={190}>
          <FilterOperatorPicker
            type={property.type}
            current={operator}
            onSelect={onOperatorChange}
            onClose={() => setShowOperatorMenu(false)}
          />
        </PortalDropdown>
      )}

      {/* ··· More actions menu */}
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

// ═══════════════════════════════════════════════════════════════════════════════
// DATE FILTER VALUE EDITOR — Date presets, calendar, operator selector
// ═══════════════════════════════════════════════════════════════════════════════

function DateFilterValueEditor({ property, operator, value, onOperatorChange, onValueChange, onDelete, onClose }: {
  property: SchemaProperty;
  operator: FilterOperator;
  value: any;
  onOperatorChange: (op: FilterOperator) => void;
  onValueChange: (val: any) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const operatorBtnRef = useRef<HTMLButtonElement>(null);
  const presetBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const opDisplay = getOperatorsForType(property.type).find(o => o.value === operator)?.label || 'Is';
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
      default: return; // Custom date — user uses the calendar input
    }
    onValueChange(d.toISOString().slice(0, 10));
    setShowPresetMenu(false);
  };

  return (
    <div className="flex flex-col" style={{ width: 260, maxHeight: '50vh' }}>
      {/* Header: property name + operator button + ··· */}
      <div className="flex items-center gap-1 px-2 pt-1 pb-0.5 text-xs text-ink-muted shrink-0">
        <span className="truncate flex-shrink">{property.name}</span>
        <button
          ref={operatorBtnRef}
          onClick={() => setShowOperatorMenu(true)}
          className="flex items-center gap-0.5 px-1 py-0.5 rounded text-xs text-ink-secondary font-medium hover:bg-hover-surface2 shrink-0"
        >
          {opDisplay.toLowerCase()} <ChevronDown className="w-2.5 h-2.5" />
        </button>
        <div className="flex-1" />
        <button
          ref={moreBtnRef}
          onClick={() => setShowMoreMenu(true)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 text-ink-muted shrink-0"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Date presets & calendar */}
      {showDateInput && (
        <div className="p-2 flex flex-col gap-2">
          {/* Date preset picker */}
          <button
            ref={presetBtnRef}
            onClick={() => setShowPresetMenu(true)}
            className="flex items-center justify-between w-full h-8 px-2 border border-line rounded-lg text-sm text-ink-body hover:border-hover-border transition-colors"
          >
            <span className="truncate">{displayVal}</span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-muted shrink-0" />
          </button>

          {/* Actual date input for custom dates */}
          <input
            type="date"
            value={isCustom ? value : ''}
            onChange={e => onValueChange(e.target.value)}
            className="w-full h-8 px-2 border border-line rounded-lg text-sm bg-surface-primary"
          />

          {/* Second date input for is_between */}
          {operator === 'is_between' && (
            <input
              type="date"
              value={typeof value === 'object' && value?.end ? value.end : ''}
              onChange={e => onValueChange({ start: isCustom ? value : '', end: e.target.value })}
              className="w-full h-8 px-2 border border-line rounded-lg text-sm bg-surface-primary"
            />
          )}
        </div>
      )}

      {/* Operator dropdown portal */}
      {showOperatorMenu && operatorBtnRef.current && (
        <PortalDropdown anchorRef={operatorBtnRef} onClose={() => setShowOperatorMenu(false)} width={190}>
          <FilterOperatorPicker
            type={property.type}
            current={operator}
            onSelect={onOperatorChange}
            onClose={() => setShowOperatorMenu(false)}
          />
        </PortalDropdown>
      )}

      {/* Date presets portal */}
      {showPresetMenu && presetBtnRef.current && (
        <PortalDropdown anchorRef={presetBtnRef} onClose={() => setShowPresetMenu(false)} width={240}>
          <div className="p-1 flex flex-col gap-px">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className={`w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                  displayVal === preset ? 'bg-surface-tertiary font-medium' : 'text-ink-body hover:bg-hover-surface'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </PortalDropdown>
      )}

      {/* ··· More actions */}
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

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT FILTER VALUE EDITOR — Simple input with operator selector
// ═══════════════════════════════════════════════════════════════════════════════

function TextFilterValueEditor({ property, operator, value, onOperatorChange, onValueChange, onDelete, onClose }: {
  property: SchemaProperty;
  operator: FilterOperator;
  value: any;
  onOperatorChange: (op: FilterOperator) => void;
  onValueChange: (val: any) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const operatorBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const opDisplay = getOperatorsForType(property.type).find(o => o.value === operator)?.label || 'Contains';

  return (
    <div className="flex flex-col" style={{ width: 260, maxHeight: '50vh' }}>
      {/* Header */}
      <div className="flex items-center gap-1 px-2 pt-1 pb-0.5 text-xs text-ink-muted shrink-0">
        <span className="truncate flex-shrink">{property.name}</span>
        <button
          ref={operatorBtnRef}
          onClick={() => setShowOperatorMenu(true)}
          className="flex items-center gap-0.5 px-1 py-0.5 rounded text-xs text-ink-secondary font-medium hover:bg-hover-surface2 shrink-0"
        >
          {opDisplay.toLowerCase()} <ChevronDown className="w-2.5 h-2.5" />
        </button>
        <div className="flex-1" />
        <button
          ref={moreBtnRef}
          onClick={() => setShowMoreMenu(true)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 text-ink-muted shrink-0"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Value input */}
      {needsValue(operator) && (
        <div className="p-2">
          <input
            type={property.type === 'number' ? 'number' : 'text'}
            placeholder="Value"
            value={value || ''}
            onChange={e => onValueChange(property.type === 'number' && e.target.value ? Number(e.target.value) : e.target.value)}
            className="w-full h-8 px-2 border border-line rounded-lg text-sm bg-surface-primary outline-none focus:border-focus-border-soft transition-colors"
            autoFocus
          />
        </div>
      )}

      {showOperatorMenu && operatorBtnRef.current && (
        <PortalDropdown anchorRef={operatorBtnRef} onClose={() => setShowOperatorMenu(false)} width={190}>
          <FilterOperatorPicker type={property.type} current={operator} onSelect={onOperatorChange} onClose={() => setShowOperatorMenu(false)} />
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

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER VALUE EDITOR DISPATCHER — Picks the right editor based on property type
// ═══════════════════════════════════════════════════════════════════════════════

export function FilterValueEditor(props: {
  property: SchemaProperty;
  operator: FilterOperator;
  value: any;
  onOperatorChange: (op: FilterOperator) => void;
  onValueChange: (val: any) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { property } = props;
  const t = property.type;

  if (t === 'select' || t === 'multi_select' || t === 'status') {
    return <SelectFilterValueEditor {...props} />;
  }
  if (t === 'date' || t === 'due_date' || t === 'created_time' || t === 'last_edited_time') {
    return <DateFilterValueEditor {...props} />;
  }
  // text, number, url, email, phone, title, formula, rollup, relation, etc.
  return <TextFilterValueEditor {...props} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED FILTER GRID — Grid layout with Where | Property | Operator+Value | ···
// ═══════════════════════════════════════════════════════════════════════════════

export function AdvancedFilterGrid({ filters, properties, conjunction, onAddFilter, onUpdateFilter, onRemoveFilter, onDeleteAll, onClose }: {
  filters: { id: string; propertyId: string; operator: FilterOperator; value: any }[];
  properties: Record<string, SchemaProperty>;
  conjunction: 'and' | 'or';
  onAddFilter: (propId: string) => void;
  onUpdateFilter: (filterId: string, updates: Partial<{ propertyId: string; operator: FilterOperator; value: any }>) => void;
  onRemoveFilter: (filterId: string) => void;
  onDeleteAll: () => void;
  onClose: () => void;
}) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const allProps = Object.values(properties);

  // Per-filter dropdown states
  const [openPropPicker, setOpenPropPicker] = useState<string | null>(null);
  const [openOperatorPicker, setOpenOperatorPicker] = useState<string | null>(null);
  const propBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const opBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  return (
    <div className="flex flex-col" style={{ minWidth: 290, maxHeight: '80vh' }}>
      {/* Filter rows */}
      <div className="overflow-y-auto flex-1 min-h-0 p-2">
        {filters.map((filter, idx) => {
          const prop = properties[filter.propertyId];
          if (!prop) return null;
          const operators = getOperatorsForType(prop.type);
          const opLabel = operators.find(o => o.value === filter.operator)?.label || filter.operator;

          return (
            <div key={filter.id} className="grid gap-2 mb-2 items-start"
              style={{
                gridTemplateColumns: '60px minmax(min-content, 120px) 110px auto 32px',
              }}>
              {/* Where / And / Or */}
              <div className="text-xs text-ink-muted text-right pr-1 leading-8 truncate">
                {(() => {
                  if (idx === 0) return 'Where';
                  return conjunction === 'or' ? 'Or' : 'And';
                })()}
              </div>

              {/* Property picker button */}
              <button
                ref={el => { propBtnRefs.current[filter.id] = el; }}
                onClick={() => setOpenPropPicker(openPropPicker === filter.id ? null : filter.id)}
                className="flex items-center gap-1.5 h-8 px-2 border border-line rounded-lg text-sm text-ink-body hover:border-hover-border transition-colors w-full truncate"
              >
                <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <span className="truncate flex-1 text-left">{prop.name}</span>
                <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" />
              </button>

              {/* Operator + Value — spans 2 columns */}
              <div className="col-span-2 flex items-center gap-2">
                <button
                  ref={el => { opBtnRefs.current[filter.id] = el; }}
                  onClick={() => setOpenOperatorPicker(openOperatorPicker === filter.id ? null : filter.id)}
                  className="flex items-center gap-1 h-8 px-2 border border-line rounded-lg text-sm text-ink-body hover:border-hover-border transition-colors shrink-0"
                >
                  <span className="truncate">{opLabel}</span>
                  <ChevronDown className="w-3 h-3 text-ink-muted" />
                </button>

                {needsValue(filter.operator) && (() => {
                  if (prop.type === 'select' || prop.type === 'multi_select' || prop.type === 'status') {
                    return (
                      <div className="h-8 px-2 flex items-center border border-line rounded-lg text-sm text-ink-secondary truncate">
                        {filter.value
                          ? (prop.options?.find(o => o.id === filter.value)?.value || filter.value)
                          : 'Select...'}
                      </div>
                    );
                  }
                  if (prop.type === 'date' || prop.type === 'due_date') {
                    return (
                      <input type="date" value={filter.value || ''}
                        onChange={e => onUpdateFilter(filter.id, { value: e.target.value })}
                        className="h-8 px-2 border border-line rounded-lg text-sm w-full bg-surface-primary" />
                    );
                  }
                  return (
                    <input
                      type={prop.type === 'number' ? 'number' : 'text'}
                      placeholder="Value"
                      value={filter.value || ''}
                      onChange={e => onUpdateFilter(filter.id, { value: prop.type === 'number' && e.target.value ? Number(e.target.value) : e.target.value })}
                      className="h-8 px-2 border border-line rounded-lg text-sm w-full bg-surface-primary outline-none focus:border-focus-border-soft transition-colors"
                    />
                  );
                })()}
              </div>

              {/* ··· menu */}
              <button onClick={() => onRemoveFilter(filter.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-surface2 text-ink-muted transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Property picker dropdown */}
              {openPropPicker === filter.id && propBtnRefs.current[filter.id] && (
                <PortalDropdown
                  anchorRef={{ current: propBtnRefs.current[filter.id] }}
                  onClose={() => setOpenPropPicker(null)}
                  width={220}
                >
                  <div className="p-1 flex flex-col gap-px max-h-[300px] overflow-y-auto">
                    {allProps.map(p => (
                      <button key={p.id}
                        onClick={() => {
                          const ops = getOperatorsForType(p.type);
                          onUpdateFilter(filter.id, { propertyId: p.id, operator: ops[0].value, value: '' });
                          setOpenPropPicker(null);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors">
                        <PropertyTypeIcon type={p.type} className="w-4 h-4 text-ink-secondary" />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </PortalDropdown>
              )}

              {/* Operator picker dropdown */}
              {openOperatorPicker === filter.id && opBtnRefs.current[filter.id] && (
                <PortalDropdown
                  anchorRef={{ current: opBtnRefs.current[filter.id] }}
                  onClose={() => setOpenOperatorPicker(null)}
                  width={190}
                >
                  <FilterOperatorPicker
                    type={prop.type}
                    current={filter.operator}
                    onSelect={op => { onUpdateFilter(filter.id, { operator: op }); setOpenOperatorPicker(null); }}
                    onClose={() => setOpenOperatorPicker(null)}
                  />
                </PortalDropdown>
              )}
            </div>
          );
        })}

        {/* + Add filter rule */}
        <div className="p-1">
          <button
            ref={addBtnRef}
            onClick={() => setShowAddPicker(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-ink-secondary hover:bg-hover-surface rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add filter rule</span>
            <ChevronDown className="w-3 h-3 text-ink-muted" />
          </button>
        </div>
      </div>

      {/* Footer: Delete filter */}
      <div className="border-t border-line-light p-1 shrink-0">
        <button onClick={onDeleteAll}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors">
          <Trash2 className="w-4 h-4" /> Delete filter
        </button>
      </div>

      {/* Add rule property picker */}
      {showAddPicker && addBtnRef.current && (
        <PortalDropdown anchorRef={addBtnRef} onClose={() => setShowAddPicker(false)} width={220}>
          <div className="p-1 flex flex-col gap-px max-h-[300px] overflow-y-auto">
            {allProps.map(p => (
              <button key={p.id}
                onClick={() => { onAddFilter(p.id); setShowAddPicker(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors">
                <PropertyTypeIcon type={p.type} className="w-4 h-4 text-ink-secondary" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </PortalDropdown>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER BAR (HEADER) — Horizontal scrollable bar with filter pills
// ═══════════════════════════════════════════════════════════════════════════════

export function FilterBar({ filters, properties, conjunction, viewId, onOpenAdvanced }: {
  filters: { id: string; propertyId: string; operator: FilterOperator; value: any }[];
  properties: Record<string, SchemaProperty>;
  conjunction: 'and' | 'or';
  viewId: string;
  onOpenAdvanced: () => void;
}) {
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const rulesBtnRef = useRef<HTMLButtonElement>(null);

  const store = useDatabaseStore();
  const { addFilter, updateFilter, removeFilter } = store;

  return (
    <div className="flex pt-1" style={{ paddingTop: 4 }}>
      <div className="relative flex-grow overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto px-2 py-2">
          {/* Blue "N rules" pill */}
          <button
            ref={rulesBtnRef}
            onClick={onOpenAdvanced}
            className="inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full bg-accent-soft text-accent-text-light whitespace-nowrap shrink-0"
          >
            <Filter className="w-3 h-3" />
            <span>{filters.length} rule{filters.length === 1 ? '' : 's'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Per-filter property pills */}
          {filters.map(filter => {
            const prop = properties[filter.propertyId];
            if (!prop) return null;
            return (
              <button
                key={filter.id}
                ref={el => { pillRefs.current[filter.id] = el; }}
                onClick={() => setActiveFilterId(activeFilterId === filter.id ? null : filter.id)}
                className="inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full text-ink-body-light whitespace-nowrap shrink-0 hover:bg-hover-surface2 transition-colors"
              >
                <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted" />
                <span className="max-w-[180px] truncate">{prop.name}</span>
                <ChevronDown className="w-3 h-3 text-ink-muted" />
              </button>
            );
          })}

          {/* + Filter button */}
          <button
            ref={addBtnRef}
            onClick={() => setShowAddPicker(true)}
            className="inline-flex items-center gap-1 h-6 px-2 text-sm rounded-xl text-ink-muted hover:bg-hover-surface2 whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-3 h-3" /> Filter
          </button>
        </div>
      </div>

      {/* Active filter value editor portal */}
      {activeFilterId && pillRefs.current[activeFilterId] && (() => {
        const filter = filters.find(f => f.id === activeFilterId);
        if (!filter) return null;
        const prop = properties[filter.propertyId];
        if (!prop) return null;
        return (
          <PortalDropdown
            anchorRef={{ current: pillRefs.current[activeFilterId] }}
            onClose={() => setActiveFilterId(null)}
            width={260}
          >
            <FilterValueEditor
              property={prop}
              operator={filter.operator}
              value={filter.value}
              onOperatorChange={op => updateFilter(viewId, filter.id, { operator: op })}
              onValueChange={val => updateFilter(viewId, filter.id, { value: val })}
              onDelete={() => { removeFilter(viewId, filter.id); setActiveFilterId(null); }}
              onClose={() => setActiveFilterId(null)}
            />
          </PortalDropdown>
        );
      })()}

      {/* Add filter property picker */}
      {showAddPicker && addBtnRef.current && (
        <PortalDropdown anchorRef={addBtnRef} onClose={() => setShowAddPicker(false)} width={290}>
          <FilterPropertyPicker
            properties={Object.values(properties)}
            onSelect={propId => {
              const prop = properties[propId];
              const ops = getOperatorsForType(prop?.type || 'text');
              addFilter(viewId, { propertyId: propId, operator: ops[0].value, value: '' });
              setShowAddPicker(false);
            }}
            onClose={() => setShowAddPicker(false)}
            onAdvancedFilter={() => { setShowAddPicker(false); onOpenAdvanced(); }}
          />
        </PortalDropdown>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER SETTINGS SUBPANEL — Used inside ViewSettingsPanel (back + title + list)
// ═══════════════════════════════════════════════════════════════════════════════

export function FilterSettingsSubpanel({ viewId, properties, filters, conjunction, onBack, onClose }: {
  viewId: string;
  properties: Record<string, SchemaProperty>;
  filters: { id: string; propertyId: string; operator: FilterOperator; value: any }[];
  conjunction: 'and' | 'or';
  onBack: () => void;
  onClose: () => void;
}) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const store = useDatabaseStore();
  const { addFilter } = store;
  const allProps = Object.values(properties);

  return (
    <div className="flex flex-col" style={{ minWidth: 290, maxHeight: '80vh' }}>
      {/* Header: back + title + close */}
      <div className="flex items-center px-3 pt-3.5 pb-1.5 h-[42px] shrink-0">
        <button onClick={onBack}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 mr-2 text-ink-secondary transition-colors">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path d="M2.16 8.206q.046.13.148.236l4.32 4.32a.625.625 0 0 0 .884-.884L4.259 8.625h8.991a.625.625 0 1 0 0-1.25H4.259l3.253-3.253a.625.625 0 1 0-.884-.884l-4.32 4.32a.62.62 0 0 0-.148.648" fill="currentColor" />
          </svg>
        </button>
        <span className="flex-1 font-semibold text-sm truncate">Filters</span>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-surface-tertiary hover:bg-hover-surface3 text-ink-muted transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter rows */}
      <div className="overflow-y-auto flex-1 min-h-0 p-1">
        {filters.map(filter => {
          const prop = properties[filter.propertyId];
          if (!prop) return null;
          return (
            <div key={filter.id} className="flex items-center py-1 px-2 gap-1">
              {/* Drag handle */}
              <GripVertical className="w-4 h-4 text-ink-disabled shrink-0 cursor-grab" />
              {/* Property pill */}
              <button className="inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full text-ink-body-light hover:bg-hover-surface2 transition-colors truncate">
                <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <span className="truncate max-w-[180px]">{prop.name}</span>
                <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" />
              </button>
            </div>
          );
        })}

        {/* + Add filter */}
        <button
          onClick={() => setShowAddPicker(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add filter</span>
        </button>
      </div>

      {/* Add filter property picker inline below */}
      {showAddPicker && (
        <div className="border-t border-line-light">
          <FilterPropertyPicker
            properties={allProps}
            onSelect={propId => {
              const prop = properties[propId];
              const ops = getOperatorsForType(prop?.type || 'text');
              addFilter(viewId, { propertyId: propId, operator: ops[0].value, value: '' });
              setShowAddPicker(false);
            }}
            onClose={() => setShowAddPicker(false)}
            title="Add filter"
            onAdvancedFilter={() => setShowAddPicker(false)}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EXPORT useDatabaseStore for convenience
// ═══════════════════════════════════════════════════════════════════════════════
import { useDatabaseStore } from '../store/useDatabaseStore';
