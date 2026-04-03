/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterSortPanels.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 17:11:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import type { SchemaProperty, Filter, DatabaseSchema, ViewConfig } from '../../types/database';
import { getOperatorsForType, FilterPropertyPicker, FilterBar, AdvancedFilterGrid } from '../FilterComponents';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SortPanel } from '../sort/SortPanel';
import { cn } from '../../utils/cn';

export type FilterSortPanelsSlots = {
  pickerWrap: string;
  pickerPanel: string;
  advancedWrap: string;
  sortWrap: string;
  sortPanel: string;
};

export interface FilterSortPanelsProps {
  showFilterPanel: boolean;
  showFilterPropertyPicker: boolean;
  setShowFilterPropertyPicker: (v: boolean) => void;
  showAdvancedFilter: boolean;
  setShowAdvancedFilter: (v: boolean) => void;
  setShowFilterPanel: (v: boolean) => void;
  showSortPanel: boolean;
  filters: Filter[];
  database: DatabaseSchema;
  view: ViewConfig;
  filterBtnRef: React.RefObject<HTMLButtonElement | null>;
}

export function FilterSortPanels({
  showFilterPanel, showFilterPropertyPicker, setShowFilterPropertyPicker,
  showAdvancedFilter, setShowAdvancedFilter, setShowFilterPanel,
  showSortPanel, filters, database, view, filterBtnRef, slots,
}: Readonly<FilterSortPanelsProps & { slots?: Partial<FilterSortPanelsSlots> }>) {
  const advancedFilterRef = useRef<HTMLDivElement>(null);
  const store = useDatabaseStore.getState();

  useOutsideClick(advancedFilterRef, showAdvancedFilter, () => setShowAdvancedFilter(false));

  return (
    <>
      {(showFilterPanel || filters.length > 0) && filters.length > 0 && (
        <FilterBar filters={filters} properties={database.properties}
          conjunction={view.filterConjunction || 'and'} viewId={view.id}
          onOpenAdvanced={() => setShowAdvancedFilter(true)} />
      )}
      {showFilterPropertyPicker && filterBtnRef.current && createPortal(
        <div className={cn("fixed z-[9999]")}
          style={{ top: filterBtnRef.current.getBoundingClientRect().bottom + 4, left: filterBtnRef.current.getBoundingClientRect().left }}>
          <div className={cn("bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden", slots?.pickerPanel)}
            ref={el => { if (!el) return; const handler = (e: MouseEvent) => { if (!el.contains(e.target as Node)) setShowFilterPropertyPicker(false); };
              if (!el.dataset.listening) { el.dataset.listening = '1'; setTimeout(() => document.addEventListener('mousedown', handler), 0); } }}>
            <FilterPropertyPicker properties={Object.values(database.properties) as SchemaProperty[]}
              onSelect={propId => { const prop = database.properties[propId]; const ops = getOperatorsForType(prop?.type || 'text');
                store.addFilter(view.id, { propertyId: propId, operator: ops[0].value, value: '' }); setShowFilterPropertyPicker(false); setShowFilterPanel(true); }}
              onClose={() => setShowFilterPropertyPicker(false)}
              onAdvancedFilter={() => { setShowFilterPropertyPicker(false); setShowAdvancedFilter(true); }} />
          </div>
        </div>, document.body
      )}
      {showAdvancedFilter && createPortal(
        <div ref={advancedFilterRef}
          className={cn("fixed z-[9999] bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden", slots?.advancedWrap)}
          style={{ top: 140, left: '50%', transform: 'translateX(-50%)', minWidth: 520 }}>
          <AdvancedFilterGrid filters={filters} properties={database.properties}
            conjunction={view.filterConjunction || 'and'}
            onAddFilter={propId => { const prop = database.properties[propId]; const ops = getOperatorsForType(prop?.type || 'text');
              store.addFilter(view.id, { propertyId: propId, operator: ops[0].value, value: '' }); }}
            onUpdateFilter={(filterId, updates) => store.updateFilter(view.id, filterId, updates)}
            onRemoveFilter={filterId => store.removeFilter(view.id, filterId)}
            onDeleteAll={() => { store.clearFilters(view.id); setShowAdvancedFilter(false); setShowFilterPanel(false); }}
            onClose={() => setShowAdvancedFilter(false)} />
        </div>, document.body
      )}
      {showSortPanel && (
        <div className={cn("px-4 pb-2", slots?.sortWrap)}>
          <div className={cn("bg-surface-primary border border-line rounded-xl shadow-lg w-full max-w-[420px]", slots?.sortPanel)}>
            <SortPanel database={database} view={view} />
          </div>
        </div>
      )}
    </>
  );
}
