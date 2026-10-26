/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterSortPanels.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:10 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import type { SchemaProperty, Filter, DatabaseSchema, ViewConfig } from '../../types/database';
import { FilterPropertyPicker, FilterBar, AdvancedFilterGrid } from '../FilterComponents';
import { addFilterRule } from '../filters/addFilterRule';
import { AnchoredPopover } from './AnchoredPopover';

/** Props for {@link FilterSortPanels}. */
export interface FilterSortPanelsProps {
  showFilterPanel: boolean;
  showFilterPropertyPicker: boolean;
  setShowFilterPropertyPicker: (v: boolean) => void;
  showAdvancedFilter: boolean;
  setShowAdvancedFilter: (v: boolean) => void;
  setShowFilterPanel: (v: boolean) => void;
  filters: Filter[];
  database: DatabaseSchema;
  view: ViewConfig;
  filterBtnRef: React.RefObject<HTMLButtonElement | null>;
}

// The picker's list is 290 wide inside the popover's 1px border.
const PICKER_WIDTH = 292;
const ADVANCED_WIDTH = 520;

/**
 * The filter bar under the toolbar, and the two panels the Filter button
 * opens: the property picker and the advanced filter. Both hang off the Filter
 * button and follow it. Picking a property adds its rule and opens that rule's
 * value, so the rule is never left empty with nothing to type into.
 */
export function FilterSortPanels({
  showFilterPanel, showFilterPropertyPicker, setShowFilterPropertyPicker,
  showAdvancedFilter, setShowAdvancedFilter, setShowFilterPanel,
  filters, database, view, filterBtnRef,
}: Readonly<FilterSortPanelsProps>) {
  const storeApi = useStoreApi();
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const addRule = (propId: string) => addFilterRule(storeApi, view.id, database.properties[propId]);

  return (
    <>
      {(showFilterPanel || filters.length > 0) && filters.length > 0 && (
        // odb-filter-bar: embed hosts fade this persistent bar with the toolbar.
        <div className="odb-filter-bar">
          <FilterBar filters={filters} properties={database.properties}
            conjunction={view.filterConjunction || 'and'} viewId={view.id}
            activeFilterId={editingFilterId} onActiveFilterChange={setEditingFilterId}
            onOpenAdvanced={() => setShowAdvancedFilter(true)} />
        </div>
      )}
      {showFilterPropertyPicker && (
        <AnchoredPopover anchorRef={filterBtnRef} label="Add filter" width={PICKER_WIDTH} onClose={() => setShowFilterPropertyPicker(false)}>
          <FilterPropertyPicker properties={Object.values(database.properties) as SchemaProperty[]}
            onSelect={propId => {
              setShowFilterPropertyPicker(false);
              setShowFilterPanel(true);
              setEditingFilterId(addRule(propId) ?? null);
            }}
            onClose={() => setShowFilterPropertyPicker(false)}
            onAdvancedFilter={() => { setShowFilterPropertyPicker(false); setShowAdvancedFilter(true); }} />
        </AnchoredPopover>
      )}
      {showAdvancedFilter && (
        <AnchoredPopover anchorRef={filterBtnRef} label="Advanced filter" width={ADVANCED_WIDTH} onClose={() => setShowAdvancedFilter(false)}>
          <AdvancedFilterGrid filters={filters} properties={database.properties}
            conjunction={view.filterConjunction || 'and'}
            onAddFilter={addRule}
            onUpdateFilter={(filterId, updates) => storeApi.getState().updateFilter(view.id, filterId, updates)}
            onRemoveFilter={filterId => storeApi.getState().removeFilter(view.id, filterId)}
            onDeleteAll={() => { storeApi.getState().clearFilters(view.id); setShowAdvancedFilter(false); setShowFilterPanel(false); }}
            onClose={() => setShowAdvancedFilter(false)} />
        </AnchoredPopover>
      )}
    </>
  );
}
