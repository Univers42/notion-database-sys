/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterBar.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef } from 'react';
import { ChevronDown, Plus, Filter } from 'lucide-react';
import type { FilterOperator, SchemaProperty, PropertyValue } from '../../types/database';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { getOperatorsForType } from './constants';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { PortalDropdown } from './PortalDropdown';
import { FilterValueEditor } from './FilterValueEditors';
import { FilterPropertyPicker } from './FilterPropertyPicker';
import { cn } from '../../utils/cn';

/** CSS class overrides for FilterBar sub-elements. */
export type FilterBarSlots = {
  root: string;
  wrapper: string;
  scrollArea: string;
  rulesPill: string;
  filterPill: string;
  filterPillIcon: string;
  filterPillName: string;
  addButton: string;
};

/** Renders the horizontal filter pill bar below the top bar with add/edit/remove support. */
export function FilterBar({ filters, properties, conjunction: _conjunction, viewId, onOpenAdvanced, slots }: Readonly<{
  filters: { id: string; propertyId: string; operator: FilterOperator; value: PropertyValue }[];
  properties: Record<string, SchemaProperty>;
  conjunction: 'and' | 'or';
  viewId: string;
  onOpenAdvanced: () => void;
  slots?: Partial<FilterBarSlots>;
}>) {
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const rulesBtnRef = useRef<HTMLButtonElement>(null);
  const { addFilter, updateFilter, removeFilter } = useDatabaseStore();

  return (
    <div className={cn("flex pt-1", slots?.root)} style={{ paddingTop: 4 }}>
      <div className={cn("relative flex-grow overflow-hidden", slots?.wrapper)}>
        <div className={cn("flex items-center gap-1.5 overflow-x-auto px-2 py-2", slots?.scrollArea)}>
          <button ref={rulesBtnRef} onClick={onOpenAdvanced}
            className={cn("inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full bg-accent-soft text-accent-text-light whitespace-nowrap shrink-0", slots?.rulesPill)}>
            <Filter className={cn("w-3 h-3")} />
            <span>{filters.length} rule{filters.length === 1 ? '' : 's'}</span>
            <ChevronDown className={cn("w-3 h-3")} />
          </button>
          {filters.map(filter => {
            const prop = properties[filter.propertyId];
            if (!prop) return null;
            return (
              <button key={filter.id} ref={el => { pillRefs.current[filter.id] = el; }}
                onClick={() => setActiveFilterId(activeFilterId === filter.id ? null : filter.id)}
                className={cn("inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full text-ink-body-light whitespace-nowrap shrink-0 hover:bg-hover-surface2 transition-colors", slots?.filterPill)}>
                <PropertyTypeIcon type={prop.type} className={cn("w-3.5 h-3.5 text-ink-muted", slots?.filterPillIcon)} />
                <span className={cn("max-w-[180px] truncate", slots?.filterPillName)}>{prop.name}</span>
                <ChevronDown className={cn("w-3 h-3 text-ink-muted")} />
              </button>
            );
          })}
          <button ref={addBtnRef} onClick={() => setShowAddPicker(true)}
            className={cn("inline-flex items-center gap-1 h-6 px-2 text-sm rounded-xl text-ink-muted hover:bg-hover-surface2 whitespace-nowrap shrink-0 transition-colors", slots?.addButton)}>
            <Plus className={cn("w-3 h-3")} /> Filter
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
