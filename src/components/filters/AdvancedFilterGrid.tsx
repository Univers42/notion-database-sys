/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AdvancedFilterGrid.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:39:21 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef } from 'react';
import { ChevronDown, Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import type { FilterOperator, SchemaProperty, PropertyValue } from '../../types/database';
import { getOperatorsForType, needsValue } from './constants';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { PortalDropdown } from './PortalDropdown';

function FilterOperatorPicker({ type, current, onSelect, onClose }: Readonly<{
  type: string; current: FilterOperator;
  onSelect: (op: FilterOperator) => void; onClose: () => void;
}>) {
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

function renderInlineFilterValue(
  prop: SchemaProperty,
  filter: { id: string; operator: FilterOperator; value: PropertyValue },
  onUpdateFilter: (id: string, updates: Partial<{ value: PropertyValue }>) => void,
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

function getFilterLabel(idx: number, conjunction: string): string {
  if (idx === 0) return 'Where';
  if (conjunction === 'or') return 'Or';
  return 'And';
}

export function AdvancedFilterGrid({ filters, properties, conjunction, onAddFilter, onUpdateFilter, onRemoveFilter, onDeleteAll, onClose: _onClose }: {
  filters: { id: string; propertyId: string; operator: FilterOperator; value: PropertyValue }[];
  properties: Record<string, SchemaProperty>;
  conjunction: 'and' | 'or';
  onAddFilter: (propId: string) => void;
  onUpdateFilter: (filterId: string, updates: Partial<{ propertyId: string; operator: FilterOperator; value: PropertyValue }>) => void;
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
                {getFilterLabel(idx, conjunction)}
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
