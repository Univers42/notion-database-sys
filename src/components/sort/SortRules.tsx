/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SortRules.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useRef, useState } from 'react';
import { ChevronDown, Plus, X, Trash2 } from 'lucide-react';
import type { SchemaProperty, Sort } from '../../types/database';
import { useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import { PropertyTypeIcon } from '../filters/PropertyTypeIcon';
import { PortalDropdown } from '../filters/PortalDropdown';
import { SortPropertyPicker } from './SortPropertyPicker';
import { cn } from '../../utils/cn';

const DIRECTION_LABEL = { asc: 'Ascending', desc: 'Descending' } as const;

function MenuItem({ selected, onClick, children }: Readonly<{ selected: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cn(`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
        selected ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
      }`)}>
      {children}
    </button>
  );
}

/** A rule's property or direction: a button that opens its choices beside it. */
function RuleChoice({ label, text, icon, children }: Readonly<{
  label: string; text: string; icon?: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" ref={buttonRef} onClick={() => setOpen(!open)} aria-label={label} aria-expanded={open}
        className={cn("inline-flex min-w-0 items-center gap-1.5 h-7 px-2 text-sm rounded-md border border-line bg-surface-tertiary hover:bg-hover-surface transition-colors")}>
        {icon}
        <span className={cn("truncate")}>{text}</span>
        <ChevronDown className={cn("w-3 h-3 text-ink-muted shrink-0")} />
      </button>
      {open && (
        <PortalDropdown anchorRef={buttonRef} onClose={() => setOpen(false)} width={200}>
          <div className={cn("p-1 flex flex-col gap-px")}>{children(() => setOpen(false))}</div>
        </PortalDropdown>
      )}
    </>
  );
}

/**
 * The sort rules of one view, shared by the toolbar's Sort popover and the
 * Sort screen of View settings. With no rule yet it opens on the property
 * search, since choosing a property is the only thing to do; the toolbar used
 * to add a sort on whichever property came first.
 */
export function SortRules({ viewId, properties, sorts, onEmptyClose, pickerTitle }: Readonly<{
  viewId: string;
  properties: Record<string, SchemaProperty>;
  sorts: Sort[];
  /** Leaves the empty screen: the property search was closed with no rule. */
  onEmptyClose: () => void;
  /** The property search's own header; empty inside a screen that has one. */
  pickerTitle?: string;
}>) {
  const [picking, setPicking] = useState(sorts.length === 0);
  const store = useStoreApi().getState();

  if (picking) {
    const stopPicking = () => (sorts.length ? setPicking(false) : onEmptyClose());
    return (
      <SortPropertyPicker properties={Object.values(properties)}
        onSelect={propId => { store.addSort(viewId, { propertyId: propId, direction: 'asc' }); setPicking(false); }}
        onClose={stopPicking} onBack={sorts.length ? () => setPicking(false) : undefined} title={pickerTitle} />
    );
  }

  return (
    <div className={cn("flex flex-col p-1")}>
      {sorts.map(sort => {
        const prop = properties[sort.propertyId];
        const name = prop?.name ?? 'Unknown';
        return (
          <div key={sort.id} className={cn("flex items-center py-1 px-1 gap-1.5")}>
            <RuleChoice label={`Sort by ${name}`} text={name}
              icon={prop && <PropertyTypeIcon type={prop.type} className={cn("w-3.5 h-3.5 text-ink-muted shrink-0")} />}>
              {close => Object.values(properties).map(p => (
                <MenuItem key={p.id} selected={p.id === sort.propertyId}
                  onClick={() => { store.updateSort(viewId, sort.id, { propertyId: p.id }); close(); }}>
                  <PropertyTypeIcon type={p.type} className={cn("w-3.5 h-3.5 shrink-0")} />
                  <span className={cn("truncate")}>{p.name}</span>
                </MenuItem>
              ))}
            </RuleChoice>
            <RuleChoice label={`Direction: ${DIRECTION_LABEL[sort.direction]}`} text={DIRECTION_LABEL[sort.direction]}>
              {close => (['asc', 'desc'] as const).map(direction => (
                <MenuItem key={direction} selected={direction === sort.direction}
                  onClick={() => { store.updateSort(viewId, sort.id, { direction }); close(); }}>
                  {DIRECTION_LABEL[direction]}
                </MenuItem>
              ))}
            </RuleChoice>
            <div className={cn("flex-1")} />
            <button type="button" onClick={() => store.removeSort(viewId, sort.id)} aria-label={`Remove sort by ${name}`}
              className={cn("p-0.5 text-ink-muted hover:text-ink-body rounded hover:bg-hover-surface transition-colors shrink-0")}>
              <X className={cn("w-4 h-4")} />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => setPicking(true)}
        className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors")}>
        <Plus className={cn("w-4 h-4")} /><span>Add a sort</span>
      </button>
      {sorts.length > 0 && (
        <button type="button" onClick={() => { store.clearSorts(viewId); onEmptyClose(); }}
          className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors")}>
          <Trash2 className={cn("w-4 h-4")} /><span>Delete sort</span>
        </button>
      )}
    </div>
  );
}
