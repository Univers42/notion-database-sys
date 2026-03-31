/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterEditorShell.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:15 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 19:40:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef } from 'react';
import { ChevronDown, MoreHorizontal, Trash2, Filter } from 'lucide-react';
import type { FilterOperator, SchemaProperty } from '../../types/database';
import { getOperatorsForType } from './constants';
import { PortalDropdown } from './PortalDropdown';

export interface FilterValueEditorProps {
  property: SchemaProperty;
  operator: FilterOperator;
  value: any;
  onOperatorChange: (op: FilterOperator) => void;
  onValueChange: (val: any) => void;
  onDelete: () => void;
  onClose: () => void;
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

export function FilterEditorShell({ property, operator, onOperatorChange, onDelete, children }: {
  property: SchemaProperty;
  operator: FilterOperator;
  onOperatorChange: (op: FilterOperator) => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const operatorBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const opDisplay = getOperatorsForType(property.type).find(o => o.value === operator)?.label || 'is';

  return (
    <div className="flex flex-col" style={{ width: 260, maxHeight: '50vh' }}>
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
