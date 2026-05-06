/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TopBar.tsx                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore, useStoreApi } from '../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import { ViewSettingsPanel } from './ViewSettingsPanel';
import { CURSORS } from './ui/cursors';
import { ChevronDown } from 'lucide-react';
import { Dropdown } from './topBar/index';
import { ViewTabsRow } from './topBar/ViewTabsRow';
import { FilterSortPanels } from './topBar/FilterSortPanels';
import { TopBarActions } from './topBar/TopBarActions';
import { cn } from '../utils/cn';

/** Props for {@link TopBar}. */
export interface TopBarProps {
  onViewChange?: (viewId: string) => void;
}

/** Renders the database header with view tabs, search, filter/sort controls, and settings. */
export function TopBar({ onViewChange }: TopBarProps = {}) {
  const activeViewId = useActiveViewId();
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const searchQuery = useDatabaseStore(s => s.searchQuery);
  const storeApi = useStoreApi();
  const { addView, setActiveView: _setActiveView, deleteView, duplicateView,
    addPage, renameDatabase, updateView } = storeApi.getState();
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
  const [showDbSwitcher, setShowDbSwitcher] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [isFullSize, setIsFullSize] = useState(false);
  const [showExtraActions, setShowExtraActions] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const dbViews = database ? Object.values(views).filter(v => v.databaseId === database.id) : [];

  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus(); }, [showSearch]);
  useEffect(() => { if (isEditingTitle && titleRef.current) { titleRef.current.focus(); titleRef.current.select(); } }, [isEditingTitle]);

  if (!view || !database) return null;

  const filters = view.filters || [];
  const sorts = view.sorts || [];

  const handleTitleDoubleClick = () => { setTitleValue(database.name); setIsEditingTitle(true); };
  const commitTitle = () => { if (titleValue.trim()) { renameDatabase(database.id, titleValue.trim()); } setIsEditingTitle(false); };

  return (
    <>
      <div className={cn("bg-surface-primary border-b border-line flex flex-col group/header")}>
        {/* ─── Top row: Editable title + action buttons ─── */}
        <div className={cn("flex items-center justify-between px-4 py-2")}>
          <div className={cn("flex items-center gap-1.5 min-w-0")}>
            <div className={cn("relative")}>
              <button onClick={() => setShowDbSwitcher(!showDbSwitcher)}
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
                onBlur={commitTitle}
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

          {/* Right: Action buttons */}
          <TopBarActions
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
            showViewSettings={showViewSettings} setShowViewSettings={setShowViewSettings}
            showExtraActions={showExtraActions} setShowExtraActions={setShowExtraActions}
            onNewPage={() => { const id = addPage(database.id); store.openPage(id); }}
          />
        </div>

        <ViewTabsRow dbViews={dbViews} activeViewId={activeViewId ?? ''} view={view} database={database}
          setActiveView={setActiveView} addView={addView} updateView={updateView}
          duplicateView={duplicateView} deleteView={deleteView}
          onEditTitle={handleTitleDoubleClick} onEditLayout={() => setShowViewSettings(true)} />

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
            <ViewSettingsPanel onClose={() => setShowViewSettings(false)} />
          </dialog>
        </div>
      )}

    </>
  );
}
