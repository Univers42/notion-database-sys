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
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { VIEW_ICONS, VIEW_TYPE_CARD_ICONS, VIEW_TYPE_ORDER, VIEW_LABELS } from './constants';
import { MenuRow, MenuDivider, ViewTypeCard, PanelSectionLabel } from '../ui/MenuPrimitives';
import { NewDataSourceIcon } from '../ui/Icons';
import { Icon } from '../ui/Icon';
import { ViewDotsMenu } from './MenuComponents';
import { ViewTabMenu } from './ViewTabMenu';
import { useViewTabReorder } from './useViewTabReorder';
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
  addView: (view: Omit<ViewConfig, 'id'>) => string;
  updateView: (id: string, updates: Partial<ViewConfig>) => void;
  duplicateView: (id: string) => void;
  deleteView: (id: string) => void;
  /** Reorders the database's views (tab drag-and-drop). */
  reorderViews: (databaseId: string, orderedIds: string[]) => void;
  onEditTitle: () => void;
  onEditLayout: () => void;
  /** Open the database's origin surface ("View data source" in the ··· menu). */
  onViewSource?: () => void;
  /** Set the database icon (emoji) — enables "Edit icon" in the ··· menu. */
  onSetIcon?: (icon: string) => void;
}

/** Renders the row of view tabs with rename, context menu, and add-view dropdown. */
export function ViewTabsRow({
  dbViews, activeViewId, view, database, setActiveView,
  addView, updateView, duplicateView, deleteView, reorderViews, onEditTitle, onEditLayout,
  onViewSource, onSetIcon, slots,
}: Readonly<ViewTabsRowProps & { slots?: Partial<ViewTabsRowSlots> }>) {
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [viewRenameValue, setViewRenameValue] = useState('');
  // ONE per-view panel, three triggers (Notion rules): clicking the ACTIVE
  // tab opens it; clicking a non-active tab only SELECTS it (second click
  // opens); RIGHT-click on ANY tab opens it for THAT view without selecting.
  const [tabMenu, setTabMenu] = useState<{ viewId: string; top: number; left: number } | null>(null);
  // Portaled fixed panel (Notion "Add a new view" grid) — an in-flow absolute
  // dropdown gets clipped by the embed's overflow and crushed by its width.
  const [addViewPanel, setAddViewPanel] = useState<{ top: number; left: number; width: number } | null>(null);
  const [showViewDots, setShowViewDots] = useState(false);

  const addViewBtnRef = useRef<HTMLButtonElement>(null);
  const viewDotsRef = useRef<HTMLDivElement>(null);
  const viewRenameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (renamingViewId && viewRenameRef.current) { viewRenameRef.current.focus(); viewRenameRef.current.select(); } }, [renamingViewId]);
  useOutsideClick(viewDotsRef, showViewDots, () => setShowViewDots(false));

  const { dragViewId, dropTargetId, registerTab, tabDragProps } = useViewTabReorder(dbViews, database.id, reorderViews);

  const openTabMenu = (viewId: string, el: HTMLElement, toggle: boolean) => {
    if (toggle && tabMenu?.viewId === viewId) { setTabMenu(null); return; }
    const rect = el.getBoundingClientRect();
    setTabMenu({ viewId, top: rect.bottom + 4, left: rect.left });
  };
  const menuView = tabMenu ? dbViews.find(x => x.id === tabMenu.viewId) : undefined;

  const toggleAddView = () => {
    if (addViewPanel) { setAddViewPanel(null); return; }
    const rect = addViewBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Two rows of five 92px tiles + gaps + padding, capped to the viewport.
    const width = Math.min(486, window.innerWidth - 24);
    setAddViewPanel({
      top: rect.bottom + 4,
      left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 12),
      width,
    });
  };

  return (
    <>
      <div className={cn("flex items-center px-4 py-1 border-t border-line-light", slots?.root)}>
        <div className={cn("flex items-center gap-0.5 overflow-x-auto min-w-0 mr-1", slots?.tabList)}>
          {dbViews.map(v => (
            <div key={v.id} ref={registerTab(v.id)}
              className={cn("relative group", dragViewId === v.id && 'opacity-40', slots?.tabItem)}
              {...(renamingViewId === v.id || database.locked ? {} : tabDragProps(v.id))}>
              {dropTargetId === v.id && dragViewId && dragViewId !== v.id && (
                <span aria-hidden style={{ backgroundColor: 'var(--color-accent)' }}
                  className={cn("pointer-events-none absolute -left-px top-1 bottom-1 w-0.5 rounded-full z-10")} />
              )}
              {renamingViewId === v.id ? (
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5", slots?.tabEditWrap)}>
                  {v.settings?.viewIcon ? <Icon name={v.settings.viewIcon} className={cn("w-4 h-4")} /> : VIEW_ICONS[v.type]}
                  <input ref={viewRenameRef} value={viewRenameValue} onChange={e => setViewRenameValue(e.target.value)}
                    aria-label={`Rename view ${v.name}`}
                    onBlur={() => { if (viewRenameValue.trim()) { updateView(v.id, { name: viewRenameValue.trim() }); } setRenamingViewId(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { if (viewRenameValue.trim()) { updateView(v.id, { name: viewRenameValue.trim() }); } setRenamingViewId(null); } if (e.key === 'Escape') { setRenamingViewId(null); } }}
                    className={cn("text-sm font-medium text-ink bg-surface-primary border border-accent-border-light rounded px-1 py-0 outline-none w-28", slots?.tabEditInput)} />
                </div>
              ) : (
                <button
                  onClick={e => {
                    // Contain the click: the host editor's document-level
                    // handlers (block selection/menus) must not react to
                    // database-chrome clicks.
                    e.stopPropagation();
                    if (v.id === activeViewId) openTabMenu(v.id, e.currentTarget, true);
                    else { setActiveView(v.id); setTabMenu(null); }
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  onContextMenu={e => {
                    // stopPropagation too: the host page's block-editor context
                    // menu listens at the document level and would open on top.
                    e.preventDefault(); e.stopPropagation();
                    openTabMenu(v.id, e.currentTarget, false);
                  }}
                  aria-label={v.name} title={v.name}
                  className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${v.id === activeViewId
                    ? 'bg-surface-tertiary text-ink font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`, slots?.tabButton)}>
                  {(v.settings?.tabDisplay ?? 'text_icon') !== 'text' &&
                    (v.settings?.viewIcon ? <Icon name={v.settings.viewIcon} className={cn("w-4 h-4")} /> : VIEW_ICONS[v.type])}
                  {(v.settings?.tabDisplay ?? 'text_icon') !== 'icon' && <span>{v.name}</span>}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className={cn("flex items-center gap-0.5 shrink-0", slots?.actionsWrap)}>
          {database.locked && (
            <span className={cn("px-2 text-xs text-ink-muted select-none")} title="Database is locked">🔒</span>
          )}
          {!database.locked && <>
            <button ref={addViewBtnRef} onClick={() => { toggleAddView(); setShowViewDots(false); }} aria-label="Add view"
              className={cn(`flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg transition-all ${addViewPanel
                ? 'text-ink-body-light bg-surface-tertiary opacity-100'
                : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface opacity-0 group-hover/header:opacity-100'}`, slots?.addButton)}>
              <Plus className={cn("w-3.5 h-3.5")} />
            </button>
            {addViewPanel && createPortal(
              <>
                <button type="button" className={cn("fixed inset-0 z-40 appearance-none border-0 bg-transparent p-0 cursor-default")}
                  onClick={e => { e.stopPropagation(); setAddViewPanel(null); }}
                  onMouseDown={e => e.stopPropagation()}
                  tabIndex={-1} aria-label="Close" />
                <div role="dialog" aria-label="Add a new view" data-testid="add-view-panel" // NOSONAR - propagation control
                  className={cn("fixed z-50 bg-surface-primary border border-line rounded-xl shadow-xl overflow-y-auto", slots?.addDropdown)}
                  style={{ top: addViewPanel.top, left: addViewPanel.left, width: addViewPanel.width, maxHeight: '70vh' }}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === 'Escape') setAddViewPanel(null); }}>
                  <div className={cn("p-2 flex flex-col gap-px", slots?.addDropdownInner)}>
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
                            const newViewId = addView({ databaseId: database.id, name: VIEW_LABELS[type], type, filters: [], filterConjunction: 'and', sorts: [],
                              ...(defaultGrouping ? { grouping: defaultGrouping } : {}),
                              visibleProperties: Object.keys(database.properties), settings: {} });
                            // Activate through the block's own seam — inline embeds
                            // track their view locally, not via the global activeViewId.
                            if (newViewId) setActiveView(newViewId);
                            setAddViewPanel(null);
                          }} />
                      ))}
                    </div>
                    <MenuDivider />
                    <MenuRow icon={<NewDataSourceIcon />} label="New data source" onClick={() => setAddViewPanel(null)} />
                  </div>
                </div>
              </>,
              document.body,
            )}
          </>}
          <ViewDotsMenu show={showViewDots}
            onToggle={() => { setShowViewDots(!showViewDots); setAddViewPanel(null); }}
            onClose={() => setShowViewDots(false)} containerRef={viewDotsRef}
            onDuplicate={() => { duplicateView(view.id); setShowViewDots(false); }}
            onEditTitle={() => { onEditTitle(); setShowViewDots(false); }}
            onEditLayout={() => { onEditLayout(); setShowViewDots(false); }}
            viewId={view.id}
            onViewSource={onViewSource}
            onSetIcon={onSetIcon}
            titleHidden={view.settings?.showTitle === false}
            onToggleTitle={() => updateView(view.id, { settings: { ...view.settings, showTitle: view.settings?.showTitle === false } })}
            isHoverVisible={showViewDots} />
        </div>
      </div>

      {tabMenu && menuView && (
        <ViewTabMenu view={menuView} position={tabMenu} canDelete={dbViews.length > 1}
          sourceName={database.name} sourceIcon={database.icon}
          onClose={() => setTabMenu(null)}
          onRename={() => { setViewRenameValue(menuView.name); setRenamingViewId(menuView.id); setTabMenu(null); }}
          onEditView={() => {
            // The settings panel edits the ACTIVE view — select first.
            if (menuView.id !== activeViewId) setActiveView(menuView.id);
            onEditLayout(); setTabMenu(null);
          }}
          onDuplicate={() => { duplicateView(menuView.id); setTabMenu(null); }}
          onDelete={() => { deleteView(menuView.id); setTabMenu(null); }}
          onViewSource={onViewSource}
          onToggleSourceTitle={() => updateView(menuView.id, { settings: { ...menuView.settings, showTitle: menuView.settings?.showTitle === false } })}
          onDisplayAs={mode => updateView(menuView.id, { settings: { ...menuView.settings, tabDisplay: mode } })} />
      )}
    </>
  );
}
