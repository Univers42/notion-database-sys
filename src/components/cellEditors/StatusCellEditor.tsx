/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   StatusCellEditor.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:07 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:08 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useMemo } from 'react';
import type { SchemaProperty, SelectOption } from '../../types/database';
import { CheckCircle2, Settings } from 'lucide-react';
import { CellPortal } from './CellPortal';
import { getDotColor } from './constants';

interface StatusCellEditorProps {
  property: SchemaProperty;
  value: any;
  databaseId: string;
  onUpdate: (v: any) => void;
  onClose: () => void;
  onEditProperty?: () => void;
}

export function StatusCellEditor({ property, value, databaseId, onUpdate, onClose, onEditProperty }: StatusCellEditorProps) {
  const options = property.options || [];
  const { statusGroups } = property;

  const groupedOptions = useMemo(() => {
    if (statusGroups && statusGroups.length > 0) {
      return statusGroups.map(sg => ({
        label: sg.label,
        color: sg.color,
        options: sg.optionIds.map(oid => options.find(o => o.id === oid)).filter((o): o is SelectOption => !!o),
      })).filter(g => g.options.length > 0);
    }
    return buildDefaultGroups(options);
  }, [options, statusGroups]);

  const handleSelect = (optId: string) => { onUpdate(optId); onClose(); };

  return (
    <CellPortal onClose={onClose} minWidth={220}>
      <div className="max-h-[60vh] overflow-y-auto py-1">
        {groupedOptions.map((group, gi) => (
          <StatusGroup key={gi} group={group} index={gi} value={value} onSelect={handleSelect} />
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

function StatusGroup({ group, index, value, onSelect }: {
  group: { label: string; options: SelectOption[] }; index: number; value: any; onSelect: (id: string) => void;
}) {
  return (
    <div>
      {index > 0 && <div className="h-px bg-surface-tertiary mx-3 my-1" />}
      <div className="px-3 py-1.5 text-xs font-medium text-ink-muted uppercase tracking-wide">{group.label}</div>
      {group.options.map(opt => {
        const isActive = opt.id === value;
        return (
          <button key={opt.id} onClick={() => onSelect(opt.id)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-hover-surface transition-colors ${isActive ? 'bg-surface-secondary' : ''}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColor(opt.color)}`} />
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>{opt.value}</span>
            {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-accent-text-soft ml-auto shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <>
      <div className="h-px bg-surface-tertiary mx-3 my-1" />
      <button onClick={onClear} className="w-full px-3 py-1.5 text-sm text-ink-secondary hover:bg-hover-surface text-left">
        Clear status
      </button>
    </>
  );
}

function EditPropertyButton({ onClick }: { onClick: () => void }) {
  return (
    <>
      <div className="h-px bg-surface-tertiary" />
      <button onClick={onClick}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-secondary hover:bg-hover-surface hover:text-hover-text-strong transition-colors">
        <Settings className="w-3.5 h-3.5" />
        <span>Edit property</span>
      </button>
    </>
  );
}
