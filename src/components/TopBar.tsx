/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TopBar.tsx                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import { ViewSettingsPanel } from './ViewSettingsPanel';
import { CURSORS } from './ui/cursors';
import {
  Plus, Search, Filter, ArrowUpDown, Settings2, ChevronDown,
  X, Maximize2, Zap,
} from 'lucide-react';
import { ThemeToggle } from './ui/ThemeToggle';
import { Dropdown, ExtraActionsMenu } from './topBar';
import { ViewTabsRow } from './topBar/ViewTabsRow';
import { FilterSortPanels } from './topBar/FilterSortPanels';
import { DbSourceDropdown } from './DbSourceDropdown';
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
  const { addView, setActiveView: _setActiveView, deleteView, duplicateView,
    addPage, renameDatabase, updateView } = useDatabaseStore.getState();
  const store = useDatabaseStore.getState();
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
  const commitTitle = () => { if (titleValue.trim()) renameDatabase(database.id, titleValue.trim()); setIsEditingTitle(false); };

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
                onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }}
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
          <div className={cn("flex items-center gap-0.5 shrink-0")}>
            <button ref={filterBtnRef}
              onClick={() => {
                if (filters.length === 0) { setShowFilterPropertyPicker(!showFilterPropertyPicker); setShowFilterPanel(false); setShowAdvancedFilter(false); }
                else { setShowFilterPanel(!showFilterPanel); setShowFilterPropertyPicker(false); }
                setShowSortPanel(false);
              }}
              className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${filters.length > 0
                ? 'bg-accent-soft text-accent-text-light font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)}>
              <Filter className={cn("w-3.5 h-3.5")} /><span className={cn("hidden sm:inline")}>Filter</span>
              {filters.length > 0 && <span className={cn("text-xs bg-accent-muted text-accent-text px-1.5 rounded-full tabular-nums")}>{filters.length}</span>}
            </button>
            <button onClick={() => { setShowSortPanel(!showSortPanel); setShowFilterPanel(false); }}
              className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${sorts.length > 0
                ? 'bg-purple-surface text-purple-text font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)}>
              <ArrowUpDown className={cn("w-3.5 h-3.5")} /><span className={cn("hidden sm:inline")}>Sort</span>
              {sorts.length > 0 && <span className={cn("text-xs bg-purple-surface-muted text-purple-text-bold px-1.5 rounded-full tabular-nums")}>{sorts.length}</span>}
            </button>
            <button className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface transition-colors")}>
              <Zap className={cn("w-3.5 h-3.5")} /><span className={cn("hidden sm:inline")}>Automations</span>
            </button>

            {showSearch ? (
              <div className={cn("flex items-center gap-1 bg-surface-tertiary rounded-lg px-2 py-1")}>
                <Search className={cn("w-3.5 h-3.5 text-ink-muted")} />
                <input ref={searchRef} type="text" placeholder="Search..." value={localSearchValue}
                  onChange={e => { const v = e.target.value; setLocalSearchValue(v); clearTimeout(searchDebounceRef.current); searchDebounceRef.current = setTimeout(() => store.setSearchQuery(v), 200); }}
                  onKeyDown={e => { if (e.key === 'Escape') { clearTimeout(searchDebounceRef.current); setLocalSearchValue(''); store.setSearchQuery(''); setShowSearch(false); } }}
                  className={cn("bg-transparent text-sm w-40 outline-none placeholder:text-placeholder")} />
                <button onClick={() => { clearTimeout(searchDebounceRef.current); setLocalSearchValue(''); store.setSearchQuery(''); setShowSearch(false); }} className={cn("p-0.5 hover:bg-hover-surface3 rounded")}>
                  <X className={cn("w-3 h-3 text-ink-muted")} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)} className={cn("p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors")} title="Search">
                <Search className={cn("w-4 h-4")} />
              </button>
            )}

            <button onClick={() => setIsFullSize(!isFullSize)}
              className={cn(`p-2 rounded-lg transition-colors ${isFullSize ? 'bg-surface-tertiary text-ink-body' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)} title="Full-size">
              <Maximize2 className={cn("w-4 h-4")} />
            </button>
            <button onClick={() => setShowViewSettings(!showViewSettings)}
              className={cn(`p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors ${showViewSettings ? 'bg-surface-tertiary' : ''}`)}>
              <Settings2 className={cn("w-4 h-4")} />
            </button>
            <ExtraActionsMenu show={showExtraActions} onToggle={() => setShowExtraActions(!showExtraActions)} onClose={() => setShowExtraActions(false)} />
            <DbSourceDropdown />
            <ThemeToggle />
            <div className={cn("w-px h-5 bg-surface-muted mx-1")} />
            <button onClick={() => { const id = addPage(database.id); store.openPage(id); }}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 bg-accent text-ink-inverse text-sm font-medium rounded-lg hover:bg-hover-accent transition-colors shadow-sm")}>
              <Plus className={cn("w-3.5 h-3.5")} /> New
            </button>
          </div>
        </div>

        <ViewTabsRow dbViews={dbViews} activeViewId={activeViewId!} view={view} database={database}
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
          <div className={cn("relative z-[60] w-80 bg-surface-primary border-l border-line shadow-xl h-full overflow-auto")} onClick={e => e.stopPropagation()}>
            <ViewSettingsPanel onClose={() => setShowViewSettings(false)} />
          </div>
        </div>
      )}

    </>
  );
}
