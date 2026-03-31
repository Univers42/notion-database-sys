import React, { useState, useRef } from 'react';
import {
  ChevronDown, Plus, X, GripVertical, Trash2, MoreHorizontal, Filter,
} from 'lucide-react';
import type { FilterOperator, SchemaProperty } from '../types/database';
import { useDatabaseStore } from '../store/useDatabaseStore';

export { FILTER_OPERATORS, getOperatorsForType, needsValue } from './filters/constants';
export { PropertyTypeIcon } from './filters/PropertyTypeIcon';
export { FilterValueEditor } from './filters/FilterValueEditors';

import { getOperatorsForType, needsValue } from './filters/constants';
import { PropertyTypeIcon } from './filters/PropertyTypeIcon';
import { PortalDropdown } from './filters/PortalDropdown';
import { FilterValueEditor } from './filters/FilterValueEditors';

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
      {title && (
        <div className="flex items-center px-3 pt-3.5 pb-1.5 h-[42px] shrink-0">
          <span className="flex-1 font-semibold text-sm truncate">{title}</span>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-hover-surface2 text-ink-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-center rounded-md border border-line bg-surface-secondary h-7 px-1.5">
          <input type="text" placeholder="Filter by…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder-placeholder" autoFocus />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 min-h-0 p-1">
        <div className="flex flex-col gap-px">
          {filtered.map(prop => (
            <button key={prop.id} onClick={() => onSelect(prop.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <PropertyTypeIcon type={prop.type} className="w-4 h-4 text-ink-secondary shrink-0" />
              <span className="truncate">{prop.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-sm text-ink-muted text-center">No properties found</div>
          )}
        </div>
      </div>
      {onAdvancedFilter && (
        <div className="border-t border-line-light p-1 shrink-0">
          <button onClick={onAdvancedFilter}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors">
            <Plus className="w-4 h-4" /><span>Add advanced filter</span>
          </button>
        </div>
      )}
    </div>
  );
}

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

  const [openPropPicker, setOpenPropPicker] = useState<string | null>(null);
  const [openOperatorPicker, setOpenOperatorPicker] = useState<string | null>(null);
  const propBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const opBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  return (
    <div className="flex flex-col" style={{ minWidth: 290, maxHeight: '80vh' }}>
      <div className="overflow-y-auto flex-1 min-h-0 p-2">
        {filters.map((filter, idx) => {
          const prop = properties[filter.propertyId];
          if (!prop) return null;
          const operators = getOperatorsForType(prop.type);
          const opLabel = operators.find(o => o.value === filter.operator)?.label || filter.operator;

          return (
            <div key={filter.id} className="grid gap-2 mb-2 items-start"
              style={{ gridTemplateColumns: '60px minmax(min-content, 120px) 110px auto 32px' }}>
              <div className="text-xs text-ink-muted text-right pr-1 leading-8 truncate">
                {idx === 0 ? 'Where' : conjunction === 'or' ? 'Or' : 'And'}
              </div>
              <button ref={el => { propBtnRefs.current[filter.id] = el; }}
                onClick={() => setOpenPropPicker(openPropPicker === filter.id ? null : filter.id)}
                className="flex items-center gap-1.5 h-8 px-2 border border-line rounded-lg text-sm text-ink-body hover:border-hover-border transition-colors w-full truncate">
                <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <span className="truncate flex-1 text-left">{prop.name}</span>
                <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" />
              </button>
              <div className="col-span-2 flex items-center gap-2">
                <button ref={el => { opBtnRefs.current[filter.id] = el; }}
                  onClick={() => setOpenOperatorPicker(openOperatorPicker === filter.id ? null : filter.id)}
                  className="flex items-center gap-1 h-8 px-2 border border-line rounded-lg text-sm text-ink-body hover:border-hover-border transition-colors shrink-0">
                  <span className="truncate">{opLabel}</span>
                  <ChevronDown className="w-3 h-3 text-ink-muted" />
                </button>
                {needsValue(filter.operator) && renderInlineFilterValue(prop, filter, onUpdateFilter)}
              </div>
              <button onClick={() => onRemoveFilter(filter.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-surface2 text-ink-muted transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {openPropPicker === filter.id && propBtnRefs.current[filter.id] && (
                <PortalDropdown anchorRef={{ current: propBtnRefs.current[filter.id] }} onClose={() => setOpenPropPicker(null)} width={220}>
                  <div className="p-1 flex flex-col gap-px max-h-[300px] overflow-y-auto">
                    {allProps.map(p => (
                      <button key={p.id}
                        onClick={() => { const ops = getOperatorsForType(p.type); onUpdateFilter(filter.id, { propertyId: p.id, operator: ops[0].value, value: '' }); setOpenPropPicker(null); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors">
                        <PropertyTypeIcon type={p.type} className="w-4 h-4 text-ink-secondary" />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </PortalDropdown>
              )}
              {openOperatorPicker === filter.id && opBtnRefs.current[filter.id] && (
                <PortalDropdown anchorRef={{ current: opBtnRefs.current[filter.id] }} onClose={() => setOpenOperatorPicker(null)} width={190}>
                  <FilterOperatorPicker type={prop.type} current={filter.operator}
                    onSelect={op => { onUpdateFilter(filter.id, { operator: op }); setOpenOperatorPicker(null); }}
                    onClose={() => setOpenOperatorPicker(null)} />
                </PortalDropdown>
              )}
            </div>
          );
        })}

        <div className="p-1">
          <button ref={addBtnRef} onClick={() => setShowAddPicker(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-ink-secondary hover:bg-hover-surface rounded-md transition-colors">
            <Plus className="w-4 h-4" /><span>Add filter rule</span><ChevronDown className="w-3 h-3 text-ink-muted" />
          </button>
        </div>
      </div>

      <div className="border-t border-line-light p-1 shrink-0">
        <button onClick={onDeleteAll}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors">
          <Trash2 className="w-4 h-4" /> Delete filter
        </button>
      </div>

      {showAddPicker && addBtnRef.current && (
        <PortalDropdown anchorRef={addBtnRef} onClose={() => setShowAddPicker(false)} width={220}>
          <div className="p-1 flex flex-col gap-px max-h-[300px] overflow-y-auto">
            {allProps.map(p => (
              <button key={p.id} onClick={() => { onAddFilter(p.id); setShowAddPicker(false); }}
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

function renderInlineFilterValue(
  prop: SchemaProperty,
  filter: { id: string; operator: FilterOperator; value: any },
  onUpdateFilter: (id: string, updates: Partial<{ value: any }>) => void,
) {
  if (prop.type === 'select' || prop.type === 'multi_select' || prop.type === 'status') {
    return (
      <div className="h-8 px-2 flex items-center border border-line rounded-lg text-sm text-ink-secondary truncate">
        {filter.value ? (prop.options?.find(o => o.id === filter.value)?.value || filter.value) : 'Select...'}
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
    <input type={prop.type === 'number' ? 'number' : 'text'} placeholder="Value"
      value={filter.value || ''}
      onChange={e => onUpdateFilter(filter.id, { value: prop.type === 'number' && e.target.value ? Number(e.target.value) : e.target.value })}
      className="h-8 px-2 border border-line rounded-lg text-sm w-full bg-surface-primary outline-none focus:border-focus-border-soft transition-colors" />
  );
}

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
  const { addFilter, updateFilter, removeFilter } = useDatabaseStore();

  return (
    <div className="flex pt-1" style={{ paddingTop: 4 }}>
      <div className="relative flex-grow overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto px-2 py-2">
          <button ref={rulesBtnRef} onClick={onOpenAdvanced}
            className="inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full bg-accent-soft text-accent-text-light whitespace-nowrap shrink-0">
            <Filter className="w-3 h-3" />
            <span>{filters.length} rule{filters.length === 1 ? '' : 's'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {filters.map(filter => {
            const prop = properties[filter.propertyId];
            if (!prop) return null;
            return (
              <button key={filter.id} ref={el => { pillRefs.current[filter.id] = el; }}
                onClick={() => setActiveFilterId(activeFilterId === filter.id ? null : filter.id)}
                className="inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full text-ink-body-light whitespace-nowrap shrink-0 hover:bg-hover-surface2 transition-colors">
                <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted" />
                <span className="max-w-[180px] truncate">{prop.name}</span>
                <ChevronDown className="w-3 h-3 text-ink-muted" />
              </button>
            );
          })}
          <button ref={addBtnRef} onClick={() => setShowAddPicker(true)}
            className="inline-flex items-center gap-1 h-6 px-2 text-sm rounded-xl text-ink-muted hover:bg-hover-surface2 whitespace-nowrap shrink-0 transition-colors">
            <Plus className="w-3 h-3" /> Filter
          </button>
        </div>
      </div>

      {activeFilterId && pillRefs.current[activeFilterId] && (() => {
        const filter = filters.find(f => f.id === activeFilterId);
        if (!filter) return null;
        const prop = properties[filter.propertyId];
        if (!prop) return null;
        return (
          <PortalDropdown anchorRef={{ current: pillRefs.current[activeFilterId] }} onClose={() => setActiveFilterId(null)} width={260}>
            <FilterValueEditor property={prop} operator={filter.operator} value={filter.value}
              onOperatorChange={op => updateFilter(viewId, filter.id, { operator: op })}
              onValueChange={val => updateFilter(viewId, filter.id, { value: val })}
              onDelete={() => { removeFilter(viewId, filter.id); setActiveFilterId(null); }}
              onClose={() => setActiveFilterId(null)} />
          </PortalDropdown>
        );
      })()}

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

export function FilterSettingsSubpanel({ viewId, properties, filters, conjunction, onBack, onClose }: {
  viewId: string;
  properties: Record<string, SchemaProperty>;
  filters: { id: string; propertyId: string; operator: FilterOperator; value: any }[];
  conjunction: 'and' | 'or';
  onBack: () => void;
  onClose: () => void;
}) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const { addFilter } = useDatabaseStore();
  const allProps = Object.values(properties);

  return (
    <div className="flex flex-col" style={{ minWidth: 290, maxHeight: '80vh' }}>
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
      <div className="overflow-y-auto flex-1 min-h-0 p-1">
        {filters.map(filter => {
          const prop = properties[filter.propertyId];
          if (!prop) return null;
          return (
            <div key={filter.id} className="flex items-center py-1 px-2 gap-1">
              <GripVertical className="w-4 h-4 text-ink-disabled shrink-0 cursor-grab" />
              <button className="inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full text-ink-body-light hover:bg-hover-surface2 transition-colors truncate">
                <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <span className="truncate max-w-[180px]">{prop.name}</span>
                <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" />
              </button>
            </div>
          );
        })}
        <button onClick={() => setShowAddPicker(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors">
          <Plus className="w-4 h-4" /><span>Add filter</span>
        </button>
      </div>
      {showAddPicker && (
        <div className="border-t border-line-light">
          <FilterPropertyPicker properties={allProps}
            onSelect={propId => {
              const prop = properties[propId];
              const ops = getOperatorsForType(prop?.type || 'text');
              addFilter(viewId, { propertyId: propId, operator: ops[0].value, value: '' });
              setShowAddPicker(false);
            }}
            onClose={() => setShowAddPicker(false)} title="Add filter"
            onAdvancedFilter={() => setShowAddPicker(false)} />
        </div>
      )}
    </div>
  );
}
