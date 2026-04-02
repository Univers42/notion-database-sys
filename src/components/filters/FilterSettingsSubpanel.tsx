/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterSettingsSubpanel.tsx                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:39:21 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { ChevronDown, Plus, GripVertical, X } from 'lucide-react';
import type { FilterOperator, SchemaProperty, PropertyValue } from '../../types/database';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { getOperatorsForType } from './constants';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { FilterPropertyPicker } from './FilterPropertyPicker';

export function FilterSettingsSubpanel({ viewId, properties, filters, conjunction: _conjunction, onBack, onClose }: {
  viewId: string;
  properties: Record<string, SchemaProperty>;
  filters: { id: string; propertyId: string; operator: FilterOperator; value: PropertyValue }[];
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
