/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableHeader.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { createPortal } from 'react-dom';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { SchemaProperty, PropertyType } from '../../../types/database';
import { CURSORS } from '../../ui/cursors';
import { PropIcon } from '../../../constants/propertyIcons';
import {
  ChevronDown, MoreHorizontal, EyeOff, Plus,
  GripVertical, Eye, Search,
} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { AddPropertyPanel, ADD_PANEL_WIDTH } from './AddPropertyPanel';
import { colWidthVar } from './useColumnResize';
import { cn } from '../../../utils/cn';

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
  /** Notion parity: a freshly added property opens its config panel to rename. */
  onPropertyCreated?: (prop: SchemaProperty, position: { top: number; left: number }) => void;
}

/** Renders the table header with column controls, drag reordering, resize handles, and property management. */
export function TableHeader({
  visibleProps, showRowNumbers, showVerticalLines, getColWidth,
  resizingCol, handleResizeStart, dragColId, setDragColId,
  viewId, databaseId, searchQuery, setSearchQuery,
  filteredVisible, filteredHidden, onHeaderClick, onPropertyCreated,
}: Readonly<TableHeaderProps>) {
  const storeApi = useStoreApi();
  const { addProperty, togglePropertyVisibility, hideAllProperties } = storeApi.getState();
  const [addPanel, setAddPanel] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const addBtnRef = React.useRef<HTMLButtonElement>(null);

  const openAddPanel = () => {
    const btn = addBtnRef.current;
    if (!btn) return;
    const bRect = btn.getBoundingClientRect();
    const tRect = btn.closest('table')?.getBoundingClientRect() ?? bRect;
    // Floats LEFT of the table, over the page margin/sidebar — never over the
    // columns being edited. When that gap is narrower than the preferred
    // width the panel SHRINKS to fit (down to 280px) instead of sliding
    // right over the table; only a margin under ~300px overlaps at all.
    const width = Math.min(ADD_PANEL_WIDTH, Math.max(280, tRect.left - 20));
    setAddPanel({
      top: bRect.bottom + 4,
      left: Math.max(8, tRect.left - width - 12),
      width,
    });
  };

  const handleAddProperty = (label: string, type: PropertyType) => {
    const newPropId = addProperty(databaseId, label, type);
    setAddPanel(null);
    const rect = addBtnRef.current?.getBoundingClientRect();
    // Read the fresh property from the store — render-scope snapshots predate it.
    const prop = storeApi.getState().databases[databaseId]?.properties[newPropId];
    if (prop && rect) {
      onPropertyCreated?.(prop, { top: rect.bottom + 4, left: rect.left });
    }
  };

  return (
    <thead className={cn("sticky top-0 z-30")}>
      <tr className={cn("bg-surface-secondary border-b border-line")}>
        <th className={cn("w-10 px-2 py-2 text-xs font-medium text-ink-muted border-r border-line bg-surface-secondary text-center")}>
          {showRowNumbers ? '#' : ''}
        </th>
        {visibleProps.map(prop => {
          // var() first: a resize drag moves the column per frame through one
          // CSS custom property on the table element (no store write per RAF);
          // the store-backed width is the resting fallback. See useColumnResize.
          const width = `var(${colWidthVar(prop.id)}, ${getColWidth(prop.id)}px)`;
          return (
          <th key={prop.id}
            className={cn(`px-3 py-2 text-xs font-medium text-ink-secondary ${showVerticalLines ? 'border-r' : ''} border-line bg-surface-secondary group relative select-none transition-opacity ${dragColId === prop.id ? 'opacity-40' : ''}`)}
            style={{ width, minWidth: width, maxWidth: width, cursor: CURSORS.grab }}
            draggable
            onDragStart={e => { setDragColId(prop.id); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }}
            onDragEnd={() => setDragColId(null)}
            onDragOver={e => {
              // Live reorder (Notion parity): crossing a header's midpoint slides
              // the dragged column there immediately — the drag SHOWS its
              // consequence instead of committing invisibly on drop. Store write
              // only when the order actually changes (cheap per dragover).
              e.preventDefault();
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
              if (!dragColId || dragColId === prop.id) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const after = e.clientX > rect.left + rect.width / 2;
              const state = storeApi.getState();
              const order = state.views[viewId].visibleProperties;
              const without = order.filter(id => id !== dragColId);
              const hoverIdx = without.indexOf(prop.id);
              if (hoverIdx < 0) return;
              const next = [...without];
              next.splice(hoverIdx + (after ? 1 : 0), 0, dragColId);
              if (next.join(' ') !== order.join(' ')) state.reorderProperties(viewId, next);
            }}
            onDrop={e => { e.preventDefault(); setDragColId(null); }}>
            <button
              onClick={(e) => onHeaderClick(e, prop)}
              className={cn("flex items-center justify-between w-full hover:bg-hover-surface2 px-1 py-0.5 rounded transition-colors outline-none")}>
              <div className={cn("flex items-center gap-1.5")}>
                <PropIcon type={prop.type} className={cn("w-3.5 h-3.5 text-ink-muted")} />
                <span className={cn("truncate")}>{prop.name}</span>
              </div>
              <ChevronDown className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-ink-muted shrink-0")} />
            </button>
            <div // NOSONAR - custom resize separator
              role="separator" tabIndex={0} aria-label="Resize column"
              aria-orientation="vertical" aria-valuemin={60} aria-valuemax={600}
              aria-valuenow={Math.min(600, Math.max(60, Math.round(getColWidth(prop.id))))}
              className={cn(`absolute top-0 right-0 w-1 h-full hover:bg-hover-accent-subtle transition-colors ${resizingCol === prop.id ? 'bg-accent' : ''}`)} // NOSONAR - resize separator needs tabIndex
              style={{ cursor: CURSORS.colResize }}
              onMouseDown={e => handleResizeStart(e, prop.id)} />
          </th>
          );
        })}
        <th className={cn("w-10 px-2 py-2 border-line text-center bg-surface-secondary")}>
          <button ref={addBtnRef} onClick={openAddPanel} aria-label="Add property" className={cn("p-1 hover:bg-hover-surface3 rounded text-ink-muted transition-colors")}><Plus className={cn("w-4 h-4")} /></button>
          {addPanel && createPortal(
            <>
              <button type="button" className={cn("fixed inset-0 z-40 appearance-none border-0 bg-transparent p-0 cursor-default")} onClick={() => setAddPanel(null)} tabIndex={-1} aria-label="Close" />
              <div data-testid="add-property-panel" role="dialog" aria-label="Select type"
                className={cn("fixed z-50 bg-surface-primary rounded-xl shadow-xl border border-line")}
                style={{ top: addPanel.top, left: addPanel.left, width: addPanel.width, maxHeight: Math.max(160, window.innerHeight - addPanel.top - 12) }}
                onKeyDown={e => { if (e.key === 'Escape') setAddPanel(null); }}>
                <AddPropertyPanel onPick={handleAddProperty} />
              </div>
            </>,
            document.body,
          )}
        </th>
        <th className={cn("w-10 px-2 py-2 text-center bg-surface-secondary")}>
          <Popover.Root>
            <Popover.Trigger asChild>
              <button aria-label="Column options" className={cn("p-1 hover:bg-hover-surface3 rounded text-ink-muted transition-colors")}><MoreHorizontal className={cn("w-4 h-4")} /></button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="end" className={cn("w-64 bg-surface-primary rounded-lg shadow-xl border border-line p-2 text-sm z-50")}>
                <div className={cn("relative mb-2")}>
                  <Search className={cn("w-4 h-4 absolute left-2 top-2 text-ink-muted")} />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Search properties"
                    className={cn("w-full bg-surface-secondary rounded-md pl-8 pr-2 py-1.5 outline-none focus:ring-1 ring-ring-accent text-sm")} placeholder="Search properties..." />
                </div>
                <div className={cn("max-h-64 overflow-y-auto")}>
                  {filteredVisible.length > 0 && (
                    <div className={cn("mb-2")}>
                      <div className={cn("flex justify-between items-center px-2 py-1 text-xs text-ink-muted font-medium")}>
                        <span>Shown in table</span>
                        <button onClick={() => hideAllProperties(viewId)} className={cn("hover:text-hover-text-strong")}>Hide all</button>
                      </div>
                      {filteredVisible.map(p => (
                        <div key={p.id} className={cn("flex items-center justify-between px-2 py-1.5 hover:bg-hover-surface rounded group")}>
                          <div className={cn("flex items-center gap-2 overflow-hidden")}>
                            <GripVertical className={cn("w-3.5 h-3.5 text-ink-disabled opacity-0 group-hover:opacity-100 cursor-grab shrink-0")} />
                            <PropIcon type={p.type} className={cn("w-3.5 h-3.5 text-ink-muted shrink-0")} />
                            <span className={cn("truncate text-ink-body")}>{p.name}</span>
                          </div>
                          <button aria-label={`Hide ${p.name}`} onClick={() => togglePropertyVisibility(viewId, p.id)} className={cn("shrink-0 ml-2")}>
                            <Eye className={cn("w-4 h-4 text-accent-text-soft hover:text-hover-accent-text-bold")} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {filteredHidden.length > 0 && (
                    <div>
                      <div className={cn("px-2 py-1 text-xs text-ink-muted font-medium")}>Hidden in table</div>
                      {filteredHidden.map(p => (
                        <div key={p.id} className={cn("flex items-center justify-between px-2 py-1.5 hover:bg-hover-surface rounded group")}>
                          <div className={cn("flex items-center gap-2 overflow-hidden")}>
                            <GripVertical className={cn("w-3.5 h-3.5 text-ink-disabled opacity-0 group-hover:opacity-100 cursor-grab shrink-0")} />
                            <PropIcon type={p.type} className={cn("w-3.5 h-3.5 text-ink-muted shrink-0")} />
                            <span className={cn("truncate text-ink-body")}>{p.name}</span>
                          </div>
                          <button aria-label={`Show ${p.name}`} onClick={() => togglePropertyVisibility(viewId, p.id)} className={cn("shrink-0 ml-2")}>
                            <EyeOff className={cn("w-4 h-4 text-ink-muted hover:text-hover-text-strong")} />
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
