/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   StatusCellEditor.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:07 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback, useMemo } from 'react';
import type { SchemaProperty, SelectOption, PropertyValue } from '../../types/database';
import { CheckCircle2, Settings } from 'lucide-react';
import { CellPortal } from './CellPortal';
import { getDotColor } from './constants';
import { useListHighlight } from '../../hooks/useListHighlight';
import { cn } from '../../utils/cn';

interface StatusCellEditorProps {
  property: SchemaProperty;
  value: PropertyValue;
  databaseId: string;
  onUpdate: (v: PropertyValue) => void;
  onClose: () => void;
  onEditProperty?: () => void;
}

/** Renders an inline editor for selecting a status value, grouped by status category. */
export function StatusCellEditor({ property, value, databaseId: _databaseId, onUpdate, onClose, onEditProperty }: Readonly<StatusCellEditorProps>) {
  const options = useMemo(() => property.options || [], [property.options]);
  const { statusGroups } = property;

  const groupedOptions = useMemo(() => {
    if (statusGroups && statusGroups.length > 0) {
      return statusGroups.map(sg => ({
        label: sg.label,
        color: sg.color,
        options: resolveGroupOptions(sg.optionIds, options),
      })).filter(g => g.options.length > 0);
    }
    return buildDefaultGroups(options);
  }, [options, statusGroups]);

  const handleSelect = (optId: string) => { onUpdate(optId); onClose(); };

  // Flat option order across groups, so ArrowUp/Down roves the whole list (there
  // is no search input to hold focus — the scroll container takes focus instead).
  const flatOptions = useMemo(() => groupedOptions.flatMap(g => g.options), [groupedOptions]);
  const { index: hi, setIndex: setHi, onArrowKey, activeRef } = useListHighlight(flatOptions.length);
  const activeId = flatOptions[hi]?.id;
  const focusOnMount = useCallback((el: HTMLDivElement | null) => { el?.focus(); }, []);
  const onHoverId = useCallback((optId: string) => {
    setHi(flatOptions.findIndex(o => o.id === optId));
  }, [flatOptions, setHi]);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onArrowKey(e)) return;
    if (e.key === 'Enter' && flatOptions[hi]) { e.preventDefault(); handleSelect(flatOptions[hi].id); }
    // Escape bubbles to CellPortal's dialog, which closes.
  };

  return (
    <CellPortal onClose={onClose} minWidth={220}>
      <div ref={focusOnMount} tabIndex={-1} onKeyDown={handleKeyDown}
        className={cn("max-h-[60vh] overflow-y-auto py-1 outline-none")}>
        {groupedOptions.map((group, gi) => (
          <React.Fragment key={group.label}>
            {gi > 0 && <div className={cn("h-px bg-surface-tertiary mx-3 my-1")} />}
            <StatusGroup group={group} value={value} activeId={activeId} activeRef={activeRef} onHoverId={onHoverId} onSelect={handleSelect} />
          </React.Fragment>
        ))}
        {value && <ClearButton onClear={() => { onUpdate(null); onClose(); }} />}
      </div>
      {onEditProperty && <EditPropertyButton onClick={() => { onEditProperty(); onClose(); }} />}
    </CellPortal>
  );
}

function buildDefaultGroups(options: SelectOption[]) {
  const groups: { label: string; color: string; options: SelectOption[] }[] = [
    { label: 'To-do', color: 'bg-surface-muted', options: [] },
    { label: 'In progress', color: 'bg-accent-subtle', options: [] },
    { label: 'Complete', color: 'bg-success-surface-medium', options: [] },
  ];
  options.forEach((opt, i) => {
    if (i === 0) groups[0].options.push(opt);
    else if (i === options.length - 1 && options.length > 1) groups[2].options.push(opt);
    else groups[1].options.push(opt);
  });
  return groups.filter(g => g.options.length > 0);
}

function resolveGroupOptions(optionIds: string[], allOptions: SelectOption[]): SelectOption[] {
  return optionIds.map(oid => allOptions.find(o => o.id === oid)).filter((o): o is SelectOption => !!o);
}

function StatusGroup({ group, value, activeId, activeRef, onHoverId, onSelect }: Readonly<{
  group: { label: string; options: SelectOption[] }; value: PropertyValue;
  activeId?: string; activeRef: React.RefObject<HTMLElement | null>; onHoverId: (id: string) => void;
  onSelect: (id: string) => void;
}>) {
  return (
    <div>
      <div className={cn("px-3 py-1.5 text-xs font-medium text-ink-muted uppercase tracking-wide")}>{group.label}</div>
      {group.options.map(opt => {
        const isSelected = opt.id === value;
        const isHighlighted = opt.id === activeId;
        return (
          <button key={opt.id} onClick={() => onSelect(opt.id)}
            ref={isHighlighted ? (activeRef as React.RefObject<HTMLButtonElement>) : undefined}
            aria-selected={isHighlighted}
            onMouseEnter={() => onHoverId(opt.id)}
            className={cn(`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${isHighlighted ? 'bg-hover-surface' : 'hover:bg-hover-surface'} ${isSelected ? 'bg-surface-secondary' : ''}`)}>
            <span className={cn(`w-2 h-2 rounded-full shrink-0 ${getDotColor(opt.color)}`)} />
            <span className={cn(`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`)}>{opt.value}</span>
            {isSelected && <CheckCircle2 className={cn("w-3.5 h-3.5 text-accent-text-soft ml-auto shrink-0")} />}
          </button>
        );
      })}
    </div>
  );
}

function ClearButton({ onClear }: Readonly<{ onClear: () => void }>) {
  return (
    <>
      <div className={cn("h-px bg-surface-tertiary mx-3 my-1")} />
      <button onClick={onClear} className={cn("w-full px-3 py-1.5 text-sm text-ink-secondary hover:bg-hover-surface text-left")}>
        Clear status
      </button>
    </>
  );
}

function EditPropertyButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <>
      <div className={cn("h-px bg-surface-tertiary")} />
      <button onClick={onClick}
        className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-secondary hover:bg-hover-surface hover:text-hover-text-strong transition-colors")}>
        <Settings className={cn("w-3.5 h-3.5")} />
        <span>Edit property</span>
      </button>
    </>
  );
}
