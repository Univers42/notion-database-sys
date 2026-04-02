/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableHeader.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { SchemaProperty, PropertyType } from '../../../types/database';
import { CURSORS } from '../../ui/cursors';
import { PropIcon, ADD_PROPERTY_TYPES } from '../../../constants/propertyIcons';
import {
  ChevronDown, MoreHorizontal, EyeOff, Plus,
  GripVertical, Eye, Search,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';

interface TableHeaderProps {
  visibleProps: SchemaProperty[];
  showRowNumbers: boolean;
  showVerticalLines: boolean;
  getColWidth: (propId: string) => number;
  resizingCol: string | null;
  handleResizeStart: (e: React.MouseEvent, propId: string) => void;
  dragColId: string | null;
  setDragColId: (id: string | null) => void;
  viewId: string;
  databaseId: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredVisible: SchemaProperty[];
  filteredHidden: SchemaProperty[];
  onHeaderClick: (e: React.MouseEvent, prop: SchemaProperty) => void;
}

export function TableHeader({
  visibleProps, showRowNumbers, showVerticalLines, getColWidth,
  resizingCol, handleResizeStart, dragColId, setDragColId,
  viewId, databaseId, searchQuery, setSearchQuery,
  filteredVisible, filteredHidden, onHeaderClick,
}: Readonly<TableHeaderProps>) {
  const { addProperty, togglePropertyVisibility, hideAllProperties } = useDatabaseStore.getState();

  return (
    <thead className="sticky top-0 z-20">
      <tr className="bg-surface-secondary border-b border-line">
        {showRowNumbers && (
          <th className="w-10 px-2 py-2 text-xs font-medium text-ink-muted border-r border-line bg-surface-secondary text-center">#</th>
        )}
        {visibleProps.map(prop => (
          <th key={prop.id}
            className={`px-3 py-2 text-xs font-medium text-ink-secondary ${showVerticalLines ? 'border-r' : ''} border-line bg-surface-secondary group relative select-none`}
            style={{ width: getColWidth(prop.id), minWidth: getColWidth(prop.id), maxWidth: getColWidth(prop.id), cursor: CURSORS.grab }}
            draggable
            onDragStart={() => setDragColId(prop.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (dragColId && dragColId !== prop.id) {
                const newOrder = [...useDatabaseStore.getState().views[viewId].visibleProperties];
                const fromIdx = newOrder.indexOf(dragColId);
                const toIdx = newOrder.indexOf(prop.id);
                newOrder.splice(fromIdx, 1);
                newOrder.splice(toIdx, 0, dragColId);
                useDatabaseStore.getState().reorderProperties(viewId, newOrder);
              }
              setDragColId(null);
            }}>
            <button
              onClick={(e) => onHeaderClick(e, prop)}
              className="flex items-center justify-between w-full hover:bg-hover-surface2 px-1 py-0.5 rounded transition-colors outline-none">
              <div className="flex items-center gap-1.5">
                <PropIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted" />
                <span className="truncate">{prop.name}</span>
              </div>
              <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-ink-muted shrink-0" />
            </button>
            <div className={`absolute top-0 right-0 w-1 h-full hover:bg-hover-accent-subtle transition-colors ${resizingCol === prop.id ? 'bg-accent' : ''}`}
              style={{ cursor: CURSORS.colResize }}
              onMouseDown={e => handleResizeStart(e, prop.id)} />
          </th>
        ))}
        <th className="w-10 px-2 py-2 border-line text-center bg-surface-secondary">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-1 hover:bg-hover-surface3 rounded text-ink-muted transition-colors"><Plus className="w-4 h-4" /></button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="w-48 bg-surface-primary rounded-lg p-1 shadow-xl border border-line text-sm z-50">
                <div className="px-2 py-1.5 text-xs font-semibold text-ink-muted uppercase">Property Type</div>
                {ADD_PROPERTY_TYPES.map(([label, type]) => (
                  <DropdownMenu.Item key={type} onSelect={() => addProperty(databaseId, `New ${label}`, type as PropertyType)}
                    className="flex items-center gap-2 px-2 py-1.5 outline-none hover:bg-hover-surface rounded cursor-pointer">
                    <PropIcon type={type} className="w-4 h-4 text-ink-muted" /> {label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </th>
        <th className="w-10 px-2 py-2 text-center bg-surface-secondary">
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="p-1 hover:bg-hover-surface3 rounded text-ink-muted transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="end" className="w-64 bg-surface-primary rounded-lg shadow-xl border border-line p-2 text-sm z-50">
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-2 top-2 text-ink-muted" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-secondary rounded-md pl-8 pr-2 py-1.5 outline-none focus:ring-1 ring-ring-accent text-sm" placeholder="Search properties..." />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredVisible.length > 0 && (
                    <div className="mb-2">
                      <div className="flex justify-between items-center px-2 py-1 text-xs text-ink-muted font-medium">
                        <span>Shown in table</span>
                        <button onClick={() => hideAllProperties(viewId)} className="hover:text-hover-text-strong">Hide all</button>
                      </div>
                      {filteredVisible.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-hover-surface rounded group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <GripVertical className="w-3.5 h-3.5 text-ink-disabled opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                            <PropIcon type={p.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                            <span className="truncate text-ink-body">{p.name}</span>
                          </div>
                          <button onClick={() => togglePropertyVisibility(viewId, p.id)} className="shrink-0 ml-2">
                            <Eye className="w-4 h-4 text-accent-text-soft hover:text-hover-accent-text-bold" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {filteredHidden.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-xs text-ink-muted font-medium">Hidden in table</div>
                      {filteredHidden.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-hover-surface rounded group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <GripVertical className="w-3.5 h-3.5 text-ink-disabled opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                            <PropIcon type={p.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                            <span className="truncate text-ink-body">{p.name}</span>
                          </div>
                          <button onClick={() => togglePropertyVisibility(viewId, p.id)} className="shrink-0 ml-2">
                            <EyeOff className="w-4 h-4 text-ink-muted hover:text-hover-text-strong" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </th>
      </tr>
    </thead>
  );
}
