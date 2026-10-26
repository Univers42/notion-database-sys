/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CardAddProperty.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import type { PropertyType, SchemaProperty } from '../../../types/database';
import { PropIcon } from '../../../constants/propertyIcons';
import { cn } from '../../../utils/cn';
import { CellPortal } from '../../cellEditors/CellPortal';
import { AddPropertyPanel, ADD_PANEL_WIDTH } from '../table/AddPropertyPanel';

/** Card footer: fill one of the view's visible-but-empty properties, or create
 *  a new one (which the store makes visible in the active view). Either way the
 *  card then edits that property in place. */
export function CardAddProperty({ emptyProps, databaseId, onEdit }: Readonly<{
  emptyProps: SchemaProperty[];
  databaseId: string;
  onEdit: (propId: string) => void;
}>) {
  const storeApi = useStoreApi();
  const [menu, setMenu] = useState<'closed' | 'list' | 'new'>('closed');
  const close = () => setMenu('closed');
  const pick = (propId: string) => { close(); onEdit(propId); };
  const create = (label: string, type: PropertyType) => pick(storeApi.getState().addProperty(databaseId, label, type));

  return (
    <div data-cell-anchor className={cn('relative z-[1] self-start')}>
      <button type="button" data-testid="card-add-property"
        onClick={() => setMenu(emptyProps.length > 0 ? 'list' : 'new')}
        className={cn(`flex items-center gap-1 rounded px-1 -mx-1 py-0.5 text-xs text-ink-muted hover:text-ink-secondary hover:bg-hover-surface focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring-accent-muted outline-none transition-opacity [@media(hover:none)]:opacity-100 ${menu === 'closed' ? 'opacity-0 group-hover/card:opacity-100' : 'opacity-100'}`)}>
        <Plus className={cn('w-3 h-3')} aria-hidden="true" /> Add a property
      </button>
      {menu === 'list' && (
        <CellPortal onClose={close} minWidth={240} maxHeight="50vh">
          <div className={cn('flex flex-col p-1')} role="menu" aria-label="Add a property">
            {emptyProps.map(prop => (
              <button key={prop.id} type="button" role="menuitem" onClick={() => pick(prop.id)}
                className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-ink-body hover:bg-hover-surface')}>
                <PropIcon type={prop.type} className={cn("w-3.5 h-3.5 shrink-0 text-ink-muted")} />
                <span className={cn('truncate')}>{prop.name}</span>
              </button>
            ))}
            <div className={cn('my-1 h-px bg-surface-tertiary')} />
            <button type="button" role="menuitem" onClick={() => setMenu('new')}
              className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-ink-body hover:bg-hover-surface')}>
              <Plus className={cn('w-3.5 h-3.5 shrink-0 text-ink-muted')} aria-hidden="true" /> New property
            </button>
          </div>
        </CellPortal>
      )}
      {menu === 'new' && (
        <CellPortal onClose={close} minWidth={ADD_PANEL_WIDTH} maxWidth={ADD_PANEL_WIDTH}>
          <AddPropertyPanel onPick={create} />
        </CellPortal>
      )}
    </div>
  );
}
