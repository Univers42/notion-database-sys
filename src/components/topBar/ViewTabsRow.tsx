/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ViewTabsRow.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 02:43:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { Dropdown } from './Dropdown';
import { VIEW_ICONS, VIEW_TYPE_CARD_ICONS, VIEW_TYPE_ORDER, VIEW_LABELS } from './constants';
import { MenuRow, MenuDivider, ViewTypeCard, PanelSectionLabel } from '../ui/MenuPrimitives';
import { PencilIcon, DuplicateIcon, NewDataSourceIcon } from '../ui/Icons';
import { Icon } from '../ui/Icon';
import { ViewDotsMenu, ActiveViewMenu } from './MenuComponents';
import type { DatabaseSchema } from '../../types/database';
import type { ViewConfig } from '../../types/views';
import { cn } from '../../utils/cn';

/** CSS class overrides for ViewTabsRow sub-elements. */
export type ViewTabsRowSlots = {
  root: string;
  tabList: string;
  tabItem: string;
  tabEditWrap: string;
  tabEditInput: string;
  tabButton: string;
  contextMenu: string;
  contextItem: string;
  contextItemDanger: string;
  actionsWrap: string;
  addButton: string;
  addDropdown: string;
  addDropdownInner: string;
  addCards: string;
};

/** Props for {@link ViewTabsRow}. */
export interface ViewTabsRowProps {
  dbViews: ViewConfig[];
  activeViewId: string;
  view: ViewConfig;
  database: DatabaseSchema;
  setActiveView: (id: string) => void;
  addView: (view: Omit<ViewConfig, 'id'>) => void;
  updateView: (id: string, updates: Partial<ViewConfig>) => void;
  duplicateView: (id: string) => void;
  deleteView: (id: string) => void;
  onEditTitle: () => void;
  onEditLayout: () => void;
}

/** Renders the row of view tabs with rename, context menu, and add-view dropdown. */
export function ViewTabsRow({
  dbViews, activeViewId, view, database, setActiveView,
  addView, updateView, duplicateView, deleteView, onEditTitle, onEditLayout, slots,
}: Readonly<ViewTabsRowProps & { slots?: Partial<ViewTabsRowSlots> }>) {
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [viewRenameValue, setViewRenameValue] = useState('');
  const [showViewMenu, setShowViewMenu] = useState<string | null>(null);
  const [showAddView, setShowAddView] = useState(false);
  const [showViewDots, setShowViewDots] = useState(false);
  const [showActiveViewMenu, setShowActiveViewMenu] = useState(false);

  const addViewRef = useRef<HTMLDivElement>(null);
  const viewDotsRef = useRef<HTMLDivElement>(null);
  const activeViewMenuRef = useRef<HTMLDivElement>(null);
  const activeTabBtnRef = useRef<HTMLButtonElement>(null);
  const viewRenameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (renamingViewId && viewRenameRef.current) { viewRenameRef.current.focus(); viewRenameRef.current.select(); } }, [renamingViewId]);
  useOutsideClick(addViewRef, showAddView, () => setShowAddView(false));
  useOutsideClick(viewDotsRef, showViewDots, () => setShowViewDots(false));

  return (
    <>
      <div className={cn("flex items-center px-4 py-1 border-t border-line-light", slots?.root)}>
        <div className={cn("flex items-center gap-0.5 overflow-x-auto min-w-0 mr-1", slots?.tabList)}>
          {dbViews.map(v => (
            <div key={v.id} className={cn("relative group", slots?.tabItem)}>
              {renamingViewId === v.id ? (
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5", slots?.tabEditWrap)}>
                  {v.settings?.viewIcon ? <Icon name={v.settings.viewIcon} className={cn("w-4 h-4")} /> : VIEW_ICONS[v.type]}
                  <input ref={viewRenameRef} value={viewRenameValue} onChange={e => setViewRenameValue(e.target.value)}
                    onBlur={() => { if (viewRenameValue.trim()) { updateView(v.id, { name: viewRenameValue.trim() }); } setRenamingViewId(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { if (viewRenameValue.trim()) { updateView(v.id, { name: viewRenameValue.trim() }); } setRenamingViewId(null); } if (e.key === 'Escape') { setRenamingViewId(null); } }}
                    className={cn("text-sm font-medium text-ink bg-surface-primary border border-accent-border-light rounded px-1 py-0 outline-none w-28", slots?.tabEditInput)} />
                </div>
              ) : (
                <button ref={v.id === activeViewId ? activeTabBtnRef : undefined}
                  onClick={() => { if (v.id === activeViewId) setShowActiveViewMenu(!showActiveViewMenu); else { setActiveView(v.id); setShowActiveViewMenu(false); } }}
                  onContextMenu={e => { e.preventDefault(); setShowViewMenu(v.id); }}
                  className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${v.id === activeViewId
                    ? 'bg-surface-tertiary text-ink font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`, slots?.tabButton)}>
                  {v.settings?.viewIcon ? <Icon name={v.settings.viewIcon} className={cn("w-4 h-4")} /> : VIEW_ICONS[v.type]}
                  <span>{v.name}</span>
                </button>
              )}
              {showViewMenu === v.id && (
                <Dropdown onClose={() => setShowViewMenu(null)}>
                  <div className={cn("p-1", slots?.contextMenu)}>
                    <button onClick={() => { setViewRenameValue(v.name); setRenamingViewId(v.id); setShowViewMenu(null); }}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-body hover:bg-hover-surface rounded-lg", slots?.contextItem)}>
                      <PencilIcon className={cn("w-3.5 h-3.5")} /> Rename
                    </button>
                    <button onClick={() => { duplicateView(v.id); setShowViewMenu(null); }}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-body hover:bg-hover-surface rounded-lg", slots?.contextItem)}>
                      <DuplicateIcon className={cn("w-3.5 h-3.5")} /> Duplicate
                    </button>
                    {dbViews.length > 1 && (
                      <button onClick={() => { deleteView(v.id); setShowViewMenu(null); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-text hover:bg-hover-danger rounded-lg", slots?.contextItemDanger)}>
                        <Trash2 className={cn("w-3.5 h-3.5")} /> Delete
                      </button>
                    )}
                  </div>
                </Dropdown>
              )}
            </div>
          ))}
        </div>

        <div className={cn("flex items-center gap-0.5 shrink-0", slots?.actionsWrap)}>
          <div className={cn("relative")} ref={addViewRef}>
            <button onClick={() => { setShowAddView(!showAddView); setShowViewDots(false); }}
              className={cn(`flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg transition-all ${showAddView
                ? 'text-ink-body-light bg-surface-tertiary opacity-100'
                : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface opacity-0 group-hover/header:opacity-100'}`, slots?.addButton)}>
              <Plus className={cn("w-3.5 h-3.5")} />
            </button>
            {showAddView && (
              <div className={cn("absolute top-full left-0 mt-1 bg-surface-primary border border-line rounded-xl shadow-lg z-50 overflow-hidden min-w-[200px] max-w-[240px]", slots?.addDropdown)}>
                <div className={cn("flex flex-col", slots?.addDropdownInner)} style={{ maxHeight: '70vh' }}>
                  <div className={cn("p-2 flex flex-col gap-px")}>
                    <PanelSectionLabel>Add a new view</PanelSectionLabel>
                    <div className={cn("flex flex-wrap gap-0.5", slots?.addCards)}>
                      {VIEW_TYPE_ORDER.map(type => (
                        <ViewTypeCard key={type} icon={VIEW_TYPE_CARD_ICONS[type]} label={VIEW_LABELS[type]}
                          active={view.type === type}
                          onClick={() => {
                            let defaultGrouping: { propertyId: string } | undefined;
                            if (type === 'board') {
                              const props = Object.values(database.properties);
                              const priorityProp = props.find(p => p.name.toLowerCase().includes('priority') && (p.type === 'select' || p.type === 'status'));
                              const statusProp = props.find(p => p.type === 'status');
                              const firstSelectProp = props.find(p => p.type === 'select' || p.type === 'status');
                              const groupProp = priorityProp || statusProp || firstSelectProp;
                              if (groupProp) defaultGrouping = { propertyId: groupProp.id };
                            }
                            addView({ databaseId: database.id, name: VIEW_LABELS[type], type, filters: [], filterConjunction: 'and', sorts: [],
                              ...(defaultGrouping ? { grouping: defaultGrouping } : {}),
                              visibleProperties: Object.keys(database.properties), settings: {} });
                            setShowAddView(false);
                          }} />
                      ))}
                    </div>
                    <MenuDivider />
                    <MenuRow icon={<NewDataSourceIcon />} label="New data source" onClick={() => setShowAddView(false)} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <ViewDotsMenu show={showViewDots}
            onToggle={() => { setShowViewDots(!showViewDots); setShowAddView(false); }}
            onClose={() => setShowViewDots(false)} containerRef={viewDotsRef}
            onDuplicate={() => { duplicateView(view.id); setShowViewDots(false); }}
            onEditTitle={() => { onEditTitle(); setShowViewDots(false); }}
            onEditLayout={() => { onEditLayout(); setShowViewDots(false); }}
            isHoverVisible={showViewDots} />
        </div>
      </div>

      <ActiveViewMenu show={showActiveViewMenu} onClose={() => setShowActiveViewMenu(false)}
        btnRef={activeTabBtnRef} menuRef={activeViewMenuRef} view={view} dbViewsLength={dbViews.length}
        onRename={() => { setViewRenameValue(view.name); setRenamingViewId(view.id); setShowActiveViewMenu(false); }}
        onEditView={() => { onEditLayout(); setShowActiveViewMenu(false); }}
        onDuplicate={() => { duplicateView(view.id); setShowActiveViewMenu(false); }}
        onDelete={() => { deleteView(view.id); setShowActiveViewMenu(false); }} />
    </>
  );
}
