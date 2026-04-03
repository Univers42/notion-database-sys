/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterEditorShell.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:15 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef } from 'react';
import { ChevronDown, MoreHorizontal, Trash2, Filter } from 'lucide-react';
import type { FilterOperator, SchemaProperty, PropertyValue } from '../../types/database';
import { getOperatorsForType } from './constants';
import { PortalDropdown } from './PortalDropdown';
import { cn } from '../../utils/cn';

export interface FilterValueEditorProps {
  property: SchemaProperty;
  operator: FilterOperator;
  value: PropertyValue;
  onOperatorChange: (op: FilterOperator) => void;
  onValueChange: (val: PropertyValue) => void;
  onDelete: () => void;
  onClose: () => void;
}

function FilterOperatorPicker({ type, current, onSelect, onClose }: Readonly<{
  type: string; current: FilterOperator;
  onSelect: (op: FilterOperator) => void; onClose: () => void;
}>) {
  return (
    <div className={cn("flex flex-col py-1")} style={{ width: 190, maxHeight: '70vh' }}>
      <div className={cn("overflow-y-auto flex-1 p-1")}>
        <div className={cn("flex flex-col gap-px")}>
          {getOperatorsForType(type).map(op => (
            <button key={op.value} onClick={() => { onSelect(op.value); onClose(); }}
              className={cn(`w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                current === op.value ? 'bg-surface-tertiary font-medium text-ink-strong' : 'text-ink-body hover:bg-hover-surface'
              }`)}>{op.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export type FilterEditorShellSlots = {
  root: string;
  header: string;
  propName: string;
  operatorButton: string;
  moreButton: string;
  menuWrap: string;
  deleteButton: string;
  advancedButton: string;
};

export function FilterEditorShell({ property, operator, onOperatorChange, onDelete, children, slots }: Readonly<{
  property: SchemaProperty;
  operator: FilterOperator;
  onOperatorChange: (op: FilterOperator) => void;
  onDelete: () => void;
  children: React.ReactNode;
  slots?: Partial<FilterEditorShellSlots>;
}>) {
  const [showOperatorMenu, setShowOperatorMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const operatorBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const opDisplay = getOperatorsForType(property.type).find(o => o.value === operator)?.label || 'is';

  return (
    <div className={cn("flex flex-col", slots?.root)} style={{ width: 260, maxHeight: '50vh' }}>
      <div className={cn("flex items-center gap-1 px-2 pt-1 pb-0.5 text-xs text-ink-muted shrink-0", slots?.header)}>
        <span className={cn("truncate flex-shrink", slots?.propName)}>{property.name}</span>
        <button ref={operatorBtnRef} onClick={() => setShowOperatorMenu(true)}
          className={cn("flex items-center gap-0.5 px-1 py-0.5 rounded text-xs text-ink-secondary font-medium hover:bg-hover-surface2 shrink-0", slots?.operatorButton)}>
          {opDisplay.toLowerCase()} <ChevronDown className={cn("w-2.5 h-2.5")} />
        </button>
        <div className={cn("flex-1")} />
        <button ref={moreBtnRef} onClick={() => setShowMoreMenu(true)}
          className={cn("w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 text-ink-muted shrink-0", slots?.moreButton)}>
          <MoreHorizontal className={cn("w-3.5 h-3.5")} />
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
          <div className={cn("p-1 flex flex-col gap-px", slots?.menuWrap)}>
            <button onClick={() => { onDelete(); setShowMoreMenu(false); }}
              className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-danger-text hover:bg-hover-danger transition-colors", slots?.deleteButton)}>
              <Trash2 className={cn("w-4 h-4")} /> Delete filter
            </button>
            <button onClick={() => setShowMoreMenu(false)}
              className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors", slots?.advancedButton)}>
              <Filter className={cn("w-4 h-4")} /> Add to advanced filter
            </button>
          </div>
        </PortalDropdown>
      )}
    </div>
  );
}
