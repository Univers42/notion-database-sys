/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AdvancedFilterGrid.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef } from 'react';
import { ChevronDown, Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import type { FilterOperator, SchemaProperty, PropertyValue } from '../../types/database';
import { getOperatorsForType, needsValue } from './constants';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { PortalDropdown } from './PortalDropdown';
import { cn } from '../../utils/cn';
import { FilterOperatorPicker, renderInlineFilterValue, getFilterLabel } from './AdvancedFilterGridHelpers';

/** CSS class overrides for AdvancedFilterGrid sub-elements. */
export type AdvancedFilterGridSlots = {
  root: string;
  body: string;
  row: string;
  rowLabel: string;
  propButton: string;
  propIcon: string;
  propName: string;
  opButton: string;
  removeButton: string;
  addButton: string;
  footer: string;
  deleteAllButton: string;
  pickerWrap: string;
  pickerItem: string;
  pickerItemIcon: string;
  pickerItemName: string;
};

/** Renders a grid-based advanced filter editor with per-row property, operator, and value controls. */
export function AdvancedFilterGrid({ filters, properties, conjunction, onAddFilter, onUpdateFilter, onRemoveFilter, onDeleteAll, onClose: _onClose, slots }: Readonly<{
  filters: { id: string; propertyId: string; operator: FilterOperator; value: PropertyValue }[];
  properties: Record<string, SchemaProperty>;
  conjunction: 'and' | 'or';
  onAddFilter: (propId: string) => void;
  onUpdateFilter: (filterId: string, updates: Partial<{ propertyId: string; operator: FilterOperator; value: PropertyValue }>) => void;
  onRemoveFilter: (filterId: string) => void;
  onDeleteAll: () => void;
  onClose: () => void;
  slots?: Partial<AdvancedFilterGridSlots>;
}>) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const allProps = Object.values(properties);

  const [openPropPicker, setOpenPropPicker] = useState<string | null>(null);
  const [openOperatorPicker, setOpenOperatorPicker] = useState<string | null>(null);
  const propBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const opBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  return (
    <div className={cn("flex flex-col", slots?.root)} style={{ minWidth: 290, maxHeight: '80vh' }}>
      <div className={cn("overflow-y-auto flex-1 min-h-0 p-2", slots?.body)}>
        {filters.map((filter, idx) => {
          const prop = properties[filter.propertyId];
          if (!prop) return null;
          const operators = getOperatorsForType(prop.type);
          const opLabel = operators.find(o => o.value === filter.operator)?.label || filter.operator;

          return (
            <div key={filter.id} className={cn("grid gap-2 mb-2 items-start", slots?.row)}
              style={{ gridTemplateColumns: '60px minmax(min-content, 120px) 110px auto 32px' }}>
              <div className={cn("text-xs text-ink-muted text-right pr-1 leading-8 truncate", slots?.rowLabel)}>
                {getFilterLabel(idx, conjunction)}
              </div>
              <button ref={el => { propBtnRefs.current[filter.id] = el; }}
                onClick={() => setOpenPropPicker(openPropPicker === filter.id ? null : filter.id)}
                className={cn("flex items-center gap-1.5 h-8 px-2 border border-line rounded-lg text-sm text-ink-body hover:border-hover-border transition-colors w-full truncate", slots?.propButton)}>
                <PropertyTypeIcon type={prop.type} className={cn("w-3.5 h-3.5 text-ink-muted shrink-0", slots?.propIcon)} />
                <span className={cn("truncate flex-1 text-left", slots?.propName)}>{prop.name}</span>
                <ChevronDown className={cn("w-3 h-3 text-ink-muted shrink-0")} />
              </button>
              <div className={cn("col-span-2 flex items-center gap-2")}>
                <button ref={el => { opBtnRefs.current[filter.id] = el; }}
                  onClick={() => setOpenOperatorPicker(openOperatorPicker === filter.id ? null : filter.id)}
                  className={cn("flex items-center gap-1 h-8 px-2 border border-line rounded-lg text-sm text-ink-body hover:border-hover-border transition-colors shrink-0", slots?.opButton)}>
                  <span className={cn("truncate")}>{opLabel}</span>
                  <ChevronDown className={cn("w-3 h-3 text-ink-muted")} />
                </button>
                {needsValue(filter.operator) && renderInlineFilterValue(prop, filter, onUpdateFilter)}
              </div>
              <button onClick={() => onRemoveFilter(filter.id)}
                className={cn("w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-surface2 text-ink-muted transition-colors", slots?.removeButton)}>
                <MoreHorizontal className={cn("w-4 h-4")} />
              </button>

              {openPropPicker === filter.id && propBtnRefs.current[filter.id] && (
                <PortalDropdown anchorRef={{ current: propBtnRefs.current[filter.id] }} onClose={() => setOpenPropPicker(null)} width={220}>
                  <div className={cn("p-1 flex flex-col gap-px max-h-[300px] overflow-y-auto", slots?.pickerWrap)}>
                    {allProps.map(p => (
                      <button key={p.id}
                        onClick={() => { const ops = getOperatorsForType(p.type); onUpdateFilter(filter.id, { propertyId: p.id, operator: ops[0].value, value: '' }); setOpenPropPicker(null); }}
                        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors", slots?.pickerItem)}>
                        <PropertyTypeIcon type={p.type} className={cn("w-4 h-4 text-ink-secondary", slots?.pickerItemIcon)} />
                        <span className={cn("truncate", slots?.pickerItemName)}>{p.name}</span>
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

        <div className={cn("p-1")}>
          <button ref={addBtnRef} onClick={() => setShowAddPicker(true)}
            className={cn("flex items-center gap-1.5 px-2 py-1.5 text-sm text-ink-secondary hover:bg-hover-surface rounded-md transition-colors", slots?.addButton)}>
            <Plus className={cn("w-4 h-4")} /><span>Add filter rule</span><ChevronDown className={cn("w-3 h-3 text-ink-muted")} />
          </button>
        </div>
      </div>

      <div className={cn("border-t border-line-light p-1 shrink-0", slots?.footer)}>
        <button onClick={onDeleteAll}
          className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors", slots?.deleteAllButton)}>
          <Trash2 className={cn("w-4 h-4")} /> Delete filter
        </button>
      </div>

      {showAddPicker && addBtnRef.current && (
        <PortalDropdown anchorRef={addBtnRef} onClose={() => setShowAddPicker(false)} width={220}>
          <div className={cn("p-1 flex flex-col gap-px max-h-[300px] overflow-y-auto", slots?.pickerWrap)}>
            {allProps.map(p => (
              <button key={p.id} onClick={() => { onAddFilter(p.id); setShowAddPicker(false); }}
                className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors", slots?.pickerItem)}>
                <PropertyTypeIcon type={p.type} className={cn("w-4 h-4 text-ink-secondary", slots?.pickerItemIcon)} />
                <span className={cn("truncate", slots?.pickerItemName)}>{p.name}</span>
              </button>
            ))}
          </div>
        </PortalDropdown>
      )}
    </div>
  );
}
