/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterBar.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/29 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef } from 'react';
import { ChevronDown, Plus, Filter } from 'lucide-react';
import type { FilterOperator, SchemaProperty, PropertyValue } from '../../types/database';
import { useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { PortalDropdown } from './PortalDropdown';
import { FilterValueEditor } from './FilterValueEditors';
import { FilterPropertyPicker } from './FilterPropertyPicker';
import { addFilterRule } from './addFilterRule';
import { filterSummary } from './filterSummary';
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

/**
 * The row of filter chips under the toolbar. Each chip reads as its rule
 * ("Name contains al") and opens that rule's editor. The editor that is open
 * is the caller's state: picking a property from the toolbar opens the new
 * rule's editor here. On a locked view the chips still say what is applied,
 * but open nothing and there is no "+ Filter".
 */
export function FilterBar({ filters, properties, conjunction: _conjunction, viewId, onOpenAdvanced,
  activeFilterId, onActiveFilterChange, locked = false, slots }: Readonly<{
  filters: { id: string; propertyId: string; operator: FilterOperator; value: PropertyValue }[];
  properties: Record<string, SchemaProperty>;
  conjunction: 'and' | 'or';
  viewId: string;
  onOpenAdvanced: () => void;
  activeFilterId: string | null;
  onActiveFilterChange: (filterId: string | null) => void;
  locked?: boolean;
  slots?: Partial<FilterBarSlots>;
}>) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  // The open chip's button. Read once placed, so a chip mounted in the same
  // render as its editor (a rule just added) still anchors it.
  const activePillRef = useRef<HTMLButtonElement | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const storeApi = useStoreApi();
  const activeFilter = locked ? undefined : filters.find(f => f.id === activeFilterId);
  const activeProperty = activeFilter && properties[activeFilter.propertyId];
  const close = () => onActiveFilterChange(null);

  return (
    <div className={cn("flex pt-1", slots?.root)} style={{ paddingTop: 4 }}>
      <div className={cn("relative flex-grow overflow-hidden", slots?.wrapper)}>
        <div className={cn("flex items-center gap-1.5 overflow-x-auto px-2 py-2", slots?.scrollArea)}>
          {/* One rule needs no group; several get the pill that opens them all. */}
          {filters.length > 1 && (
            <button type="button" onClick={onOpenAdvanced} disabled={locked}
              className={cn("inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full bg-accent-soft text-accent-text-light whitespace-nowrap shrink-0", slots?.rulesPill)}>
              <Filter className={cn("w-3 h-3")} />
              <span>{filters.length} rules</span>
              <ChevronDown className={cn("w-3 h-3")} />
            </button>
          )}
          {filters.map(filter => {
            const prop = properties[filter.propertyId];
            if (!prop) return null;
            const summary = filterSummary(prop, filter.operator, filter.value);
            const isActive = filter.id === activeFilterId;
            return (
              <button type="button" key={filter.id} title={locked ? `${summary} — this view is locked` : summary}
                aria-expanded={isActive && !locked} disabled={locked}
                ref={el => { if (isActive) activePillRef.current = el; }}
                onClick={() => onActiveFilterChange(isActive ? null : filter.id)}
                className={cn(`inline-flex items-center gap-1.5 h-6 px-2 text-sm rounded-full whitespace-nowrap shrink-0 transition-colors ${
                  summary === prop.name ? 'text-ink-body-light hover:bg-hover-surface2' : 'bg-accent-soft text-accent-text-light'
                }`, slots?.filterPill)}>
                <PropertyTypeIcon type={prop.type} className={cn("w-3.5 h-3.5 shrink-0 opacity-70", slots?.filterPillIcon)} />
                <span className={cn("max-w-[240px] truncate", slots?.filterPillName)}>{summary}</span>
                <ChevronDown className={cn("w-3 h-3 shrink-0 opacity-70")} />
              </button>
            );
          })}
          {!locked && (
            <button type="button" ref={addBtnRef} onClick={() => setShowAddPicker(true)}
              className={cn("inline-flex items-center gap-1 h-6 px-2 text-sm rounded-xl text-ink-muted hover:bg-hover-surface2 whitespace-nowrap shrink-0 transition-colors", slots?.addButton)}>
              <Plus className={cn("w-3 h-3")} /> Filter
            </button>
          )}
        </div>
      </div>

      {activeFilter && activeProperty && (
        <PortalDropdown key={activeFilter.id} anchorRef={activePillRef} onClose={close} width={260}>
          <FilterValueEditor property={activeProperty} operator={activeFilter.operator} value={activeFilter.value}
            onOperatorChange={op => storeApi.getState().updateFilter(viewId, activeFilter.id, { operator: op })}
            onValueChange={val => storeApi.getState().updateFilter(viewId, activeFilter.id, { value: val })}
            onDelete={() => { storeApi.getState().removeFilter(viewId, activeFilter.id); close(); }}
            onClose={close} />
        </PortalDropdown>
      )}

      {showAddPicker && (
        <PortalDropdown anchorRef={addBtnRef} onClose={() => setShowAddPicker(false)} width={290}>
          <FilterPropertyPicker
            properties={Object.values(properties)}
            onSelect={propId => {
              setShowAddPicker(false);
              onActiveFilterChange(addFilterRule(storeApi, viewId, properties[propId]) ?? null);
            }}
            onClose={() => setShowAddPicker(false)}
            onAdvancedFilter={() => { setShowAddPicker(false); onOpenAdvanced(); }}
          />
        </PortalDropdown>
      )}
    </div>
  );
}
