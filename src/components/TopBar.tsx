/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TopBar.tsx                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/10 00:36:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore, useStoreApi } from '../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import { ViewSettingsPanel } from './ViewSettingsPanel';
import { CURSORS } from './ui/cursors';
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { Dropdown } from './topBar/index';
import { ViewTabsRow } from './topBar/ViewTabsRow';
import { FilterSortPanels } from './topBar/FilterSortPanels';
import { TopBarActions } from './topBar/TopBarActions';
import { InlineTitle } from './topBar/InlineTitle';
import { orderedDatabaseViews } from '../lib/viewOrder';
import { cn } from '../utils/cn';

/** Props for {@link TopBar}. */
export interface TopBarProps {
  onViewChange?: (viewId: string) => void;
  variant?: 'full' | 'inline' | 'single-view';
  /** Navigate to the database's origin (full-page) surface. */
  onOpenFullPage?: (target: { databaseId: string; viewId?: string; name?: string }) => void;
  /** Called after an in-store rename so the host can persist the name. */
  onDatabaseRenamed?: (databaseId: string, name: string) => void;
  /** Inline chrome: whether the view body is collapsed. */
  collapsed?: boolean;
  /** Inline chrome: toggle the collapse. When present, a minimize button shows. */
  onToggleCollapsed?: () => void;
}

/** Renders the database header with view tabs, search, filter/sort controls, and settings. */
export function TopBar({
  onViewChange, variant = 'full', onOpenFullPage, onDatabaseRenamed, collapsed, onToggleCollapsed,
}: TopBarProps = {}) {
  const activeViewId = useActiveViewId();
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const searchQuery = useDatabaseStore(s => s.searchQuery);
  const storeApi = useStoreApi();
  const { addView, setActiveView: _setActiveView, deleteView, duplicateView,
    addPage, renameDatabase, updateDatabaseIcon, updateView, reorderViews } = storeApi.getState();
  const store = storeApi.getState();
  const setActiveView = onViewChange ?? _setActiveView;

  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const [showSearch, setShowSearch] = useState(false);
  const [localSearchValue, setLocalSearchValue] = useState(searchQuery);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showFilterPropertyPicker, setShowFilterPropertyPicker] = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [showViewSettings, setShowViewSettings] = useState(false);
  // ⚡ opens the same panel pre-navigated to Automations; keyed remount below
  // resets the panel's internal screen state between the two entry points.
  const [settingsScreen, setSettingsScreen] = useState<'automations' | undefined>(undefined);
  const [showDbSwitcher, setShowDbSwitcher] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [isFullSize, setIsFullSize] = useState(false);
  const [showExtraActions, setShowExtraActions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const dbViews = database ? orderedDatabaseViews(views, database.id, database.viewOrder) : [];
  const rowCount = useDatabaseStore(s =>
    database ? Object.values(s.pages).reduce((n, p) => n + (p.databaseId === database.id ? 1 : 0), 0) : 0);

  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus(); }, [showSearch]);
  useEffect(() => { if (isEditingTitle && titleRef.current) { titleRef.current.focus(); titleRef.current.select(); } }, [isEditingTitle]);

  if (!view || !database) return null;

  const filters = view.filters || [];
  const sorts = view.sorts || [];

  const handleTitleDoubleClick = () => { setTitleValue(database.name); setIsEditingTitle(true); };
  const commitTitle = () => {
    const next = titleValue.trim();
    if (next) { renameDatabase(database.id, next); onDatabaseRenamed?.(database.id, next); }
    setIsEditingTitle(false);
  };
  const isSingleView = variant === 'single-view';
  const isInlineChrome = variant === 'inline';
  const openOrigin = onOpenFullPage
    ? () => onOpenFullPage({ databaseId: database.id, viewId: view.id, name: database.name })
    : undefined;
  // Embed hosts fade the toolbar in/out; while any panel/dialog is open the
  // reveal must persist even if the pointer leaves (panels render in portals,
  // so :focus-within alone cannot keep them visible).
  const panelsOpen = showSearch || showFilterPanel || showSortPanel || showViewSettings
    || showExtraActions || showFilterPropertyPicker || showAdvancedFilter || showDbSwitcher
    || showTemplates;

  return (
    <>
      <div
        className={cn("odb-topbar bg-surface-primary border-b border-line flex flex-col group/header")}
        data-panels-open={panelsOpen || undefined}
        data-collapsed={collapsed || undefined}
      >
        {/* ─── Top row: Editable title + action buttons ─── */}
        <div className={cn("flex items-center justify-between px-4 py-2")}>
          {isInlineChrome ? (
            <InlineTitle
              name={database.name}
              icon={database.icon}
              hidden={view.settings?.showTitle === false}
              isEditing={isEditingTitle}
              titleValue={titleValue}
              setTitleValue={setTitleValue}
              onCommit={commitTitle}
              onCancel={() => setIsEditingTitle(false)}
              onOpen={openOrigin}
            />
          ) : isSingleView ? (
            <div className={cn("flex min-w-0 items-center gap-2")}>
              {database.icon && <span className={cn("text-base")}>{database.icon}</span>}
              <div className={cn("min-w-0")}>
                <div className={cn("truncate text-sm font-semibold text-ink")}>{view.name}</div>
                <div className={cn("truncate text-[11px] text-ink-muted")}>{database.name} · {rowCount} {rowCount === 1 ? 'row' : 'rows'}</div>
              </div>
            </div>
          ) : (
            <div className={cn("flex items-center gap-1.5 min-w-0")}>
              <div className={cn("relative")}>
                <button onClick={() => setShowDbSwitcher(!showDbSwitcher)} aria-label="Switch database"
                  className={cn("flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-hover-surface2 transition-colors")}>
                  {database.icon && <span className={cn("text-lg")}>{database.icon}</span>}
                  <ChevronDown className={cn("w-3 h-3 text-ink-muted")} />
                </button>
                {showDbSwitcher && (
                  <Dropdown onClose={() => setShowDbSwitcher(false)}>
                    <div className={cn("py-1")}>
                      <div className={cn("px-3 py-1.5 text-[10px] font-semibold text-ink-muted uppercase tracking-wider")}>Databases</div>
                      {Object.values(databases).map(db => (
                        <button key={db.id} onClick={() => {
                          const firstView = Object.values(views).find(v => v.databaseId === db.id);
                          if (firstView) setActiveView(firstView.id);
                          setShowDbSwitcher(false);
                        }}
                          className={cn(`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface transition-colors ${db.id === database.id ? 'bg-accent-soft text-accent-text' : 'text-ink-body'}`)}>
                          {db.icon && <span>{db.icon}</span>}
                          <span className={cn("font-medium")}>{db.name}</span>
                        </button>
                      ))}
                    </div>
                  </Dropdown>
                )}
              </div>
              {isEditingTitle ? (
                <input ref={titleRef} value={titleValue} onChange={e => setTitleValue(e.target.value)}
                  aria-label="Database name" onBlur={commitTitle}
                  onKeyDown={e => { if (e.key === 'Enter') { commitTitle(); } if (e.key === 'Escape') { setIsEditingTitle(false); } }}
                  className={cn("text-lg font-bold text-ink outline-none bg-transparent border-b-2 border-accent-border px-0.5 min-w-[120px]")} />
              ) : (
                <h1 style={{ cursor: CURSORS.text }}
                  className={cn("text-lg font-bold text-ink truncate hover:bg-hover-surface2 px-1 py-0.5 rounded transition-colors")}
                  onDoubleClick={handleTitleDoubleClick} title="Double-click to rename">
                  {database.name}
                </h1>
              )}
            </div>
          )}

          {/* Right: Action buttons */}
          <TopBarActions
            variant={variant}
            onOpenFullPage={openOrigin}
            filterBtnRef={filterBtnRef} filters={filters} sorts={sorts}
            showFilterPropertyPicker={showFilterPropertyPicker} setShowFilterPropertyPicker={setShowFilterPropertyPicker}
            showFilterPanel={showFilterPanel} setShowFilterPanel={setShowFilterPanel}
            setShowAdvancedFilter={setShowAdvancedFilter}
            showSortPanel={showSortPanel} setShowSortPanel={setShowSortPanel}
            showSearch={showSearch} setShowSearch={setShowSearch}
            localSearchValue={localSearchValue} setLocalSearchValue={setLocalSearchValue}
            searchRef={searchRef} searchDebounceRef={searchDebounceRef}
            onSearchQueryChange={store.setSearchQuery}
            isFullSize={isFullSize} setIsFullSize={setIsFullSize}
            showViewSettings={showViewSettings} setShowViewSettings={(v) => { setSettingsScreen(undefined); setShowViewSettings(v); }}
            onOpenAutomations={() => { setSettingsScreen('automations'); setShowViewSettings(true); }}
            automationsCount={view.settings?.automations?.length ?? 0}
            showExtraActions={showExtraActions} setShowExtraActions={setShowExtraActions}
            showTemplates={showTemplates} setShowTemplates={setShowTemplates} databaseName={database.name}
            onNewPage={() => { const id = addPage(database.id); store.openPage(id); }}
          />
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand database' : 'Minimize database'}
              title={collapsed ? 'Expand' : 'Minimize'}
              className={cn("odb-collapse-btn p-2 ml-0.5 shrink-0 text-ink-muted hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors")}
            >
              {collapsed ? <ChevronsUpDown className={cn("w-4 h-4")} /> : <ChevronsDownUp className={cn("w-4 h-4")} />}
            </button>
          )}
        </div>

        {isSingleView || collapsed ? null : (
          <ViewTabsRow dbViews={dbViews} activeViewId={activeViewId ?? ''} view={view} database={database}
            setActiveView={setActiveView} addView={addView} updateView={updateView}
            duplicateView={duplicateView} deleteView={deleteView} reorderViews={reorderViews}
            onEditTitle={handleTitleDoubleClick} onEditLayout={() => setShowViewSettings(true)}
            onViewSource={openOrigin}
            onSetIcon={(icon) => updateDatabaseIcon(database.id, icon)} />
        )}

        <FilterSortPanels showFilterPanel={showFilterPanel} showFilterPropertyPicker={showFilterPropertyPicker}
          setShowFilterPropertyPicker={setShowFilterPropertyPicker}
          showAdvancedFilter={showAdvancedFilter} setShowAdvancedFilter={setShowAdvancedFilter}
          setShowFilterPanel={setShowFilterPanel} showSortPanel={showSortPanel}
          filters={filters} database={database} view={view} filterBtnRef={filterBtnRef} />
      </div>

      {showViewSettings && (
        <div className={cn("fixed inset-0 z-50 flex justify-end")}>
          <button type="button" className={cn("fixed inset-0 appearance-none border-0 bg-transparent p-0 cursor-default")} onClick={() => setShowViewSettings(false)} tabIndex={-1} aria-label="Close" />
          <dialog open className={cn("relative z-[60] w-80 bg-surface-primary border-l border-line shadow-xl h-full overflow-auto")} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>{/* NOSONAR */}
            <ViewSettingsPanel key={settingsScreen ?? 'main'} initialScreen={settingsScreen} onClose={() => setShowViewSettings(false)} />
          </dialog>
        </div>
      )}

    </>
  );
}
