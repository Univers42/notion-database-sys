import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import { ViewSettingsPanel } from './ViewSettingsPanel';
import { MenuRow, MenuDivider, ViewTypeCard, PanelSectionLabel } from './ui/MenuPrimitives';
import { CURSORS } from './ui/cursors';
import { PencilIcon, DuplicateIcon, NewDataSourceIcon } from './ui/Icons';
import { Icon } from './ui/Icon';
import {
  Plus, Search, Filter, ArrowUpDown, Settings2, ChevronDown,
  Trash2, X, Maximize2, Zap,
} from 'lucide-react';
import type { SchemaProperty } from '../types/database';
import { getOperatorsForType, FilterPropertyPicker, FilterBar, AdvancedFilterGrid } from './FilterComponents';
import { ThemeToggle } from './ui/ThemeToggle';

import {
  useOutsideClick, Dropdown,
  VIEW_ICONS, VIEW_TYPE_CARD_ICONS, VIEW_TYPE_ORDER, VIEW_LABELS,
  SortPanel, ExtraActionsMenu, ViewDotsMenu, ActiveViewMenu,
} from './topBar';

// ═══════════════════════════════════════════════════════════════════════════════

export interface TopBarProps {
  /** If provided, view-tab clicks call this instead of mutating global activeViewId.
   *  Used by DatabaseBlock in inline mode to keep view selection local. */
  onViewChange?: (viewId: string) => void;
}

export function TopBar({ onViewChange }: TopBarProps = {}) {
  const activeViewId = useActiveViewId();
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const searchQuery = useDatabaseStore(s => s.searchQuery);
  const { addView, setActiveView: _setActiveView, deleteView, duplicateView,
    addPage, renameDatabase, updateView } = useDatabaseStore.getState();
  const store = useDatabaseStore.getState();

  // Use local callback when scoped, global store otherwise
  const setActiveView = onViewChange ?? _setActiveView;

  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  // ─── UI State ───────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [localSearchValue, setLocalSearchValue] = useState(searchQuery);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showFilterPropertyPicker, setShowFilterPropertyPicker] = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [showAddView, setShowAddView] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState<string | null>(null);
  const [showDbSwitcher, setShowDbSwitcher] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [isFullSize, setIsFullSize] = useState(false);
  const [showExtraActions, setShowExtraActions] = useState(false);
  const [showViewDots, setShowViewDots] = useState(false);
  const [showActiveViewMenu, setShowActiveViewMenu] = useState(false);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [viewRenameValue, setViewRenameValue] = useState('');

  // ─── Refs ───────────────────────────────────────────────────────────
  const searchRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const addViewRef = useRef<HTMLDivElement>(null);
  const viewDotsRef = useRef<HTMLDivElement>(null);
  const activeViewMenuRef = useRef<HTMLDivElement>(null);
  const activeTabBtnRef = useRef<HTMLButtonElement>(null);
  const viewRenameRef = useRef<HTMLInputElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const advancedFilterRef = useRef<HTMLDivElement>(null);

  const dbViews = database ? Object.values(views).filter(v => v.databaseId === database.id) : [];

  // ─── Focus effects ──────────────────────────────────────────────────
  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus(); }, [showSearch]);
  useEffect(() => { if (isEditingTitle && titleRef.current) { titleRef.current.focus(); titleRef.current.select(); } }, [isEditingTitle]);
  useEffect(() => { if (renamingViewId && viewRenameRef.current) { viewRenameRef.current.focus(); viewRenameRef.current.select(); } }, [renamingViewId]);

  // ─── Outside-click hooks ────────────────────────────────────────────
  useOutsideClick(addViewRef, showAddView, () => setShowAddView(false));
  useOutsideClick(viewDotsRef, showViewDots, () => setShowViewDots(false));
  useOutsideClick(advancedFilterRef, showAdvancedFilter, () => setShowAdvancedFilter(false));

  if (!view || !database) return null;

  const filters = view.filters || [];
  const sorts = view.sorts || [];

  const handleTitleDoubleClick = () => { setTitleValue(database.name); setIsEditingTitle(true); };
  const commitTitle = () => { if (titleValue.trim()) renameDatabase(database.id, titleValue.trim()); setIsEditingTitle(false); };

  return (
    <>
      <div className="bg-surface-primary border-b border-line flex flex-col group/header">
        {/* ─── Top row: Editable title + action buttons ─── */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative">
              <button onClick={() => setShowDbSwitcher(!showDbSwitcher)}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-hover-surface2 transition-colors">
                {database.icon && <span className="text-lg">{database.icon}</span>}
                <ChevronDown className="w-3 h-3 text-ink-muted" />
              </button>
              {showDbSwitcher && (
                <Dropdown onClose={() => setShowDbSwitcher(false)}>
                  <div className="py-1">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Databases</div>
                    {Object.values(databases).map(db => (
                      <button key={db.id} onClick={() => {
                        const firstView = Object.values(views).find(v => v.databaseId === db.id);
                        if (firstView) setActiveView(firstView.id);
                        setShowDbSwitcher(false);
                      }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface transition-colors ${db.id === database.id ? 'bg-accent-soft text-accent-text' : 'text-ink-body'}`}>
                        {db.icon && <span>{db.icon}</span>}
                        <span className="font-medium">{db.name}</span>
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
                className="text-lg font-bold text-ink outline-none bg-transparent border-b-2 border-accent-border px-0.5 min-w-[120px]" />
            ) : (
              <h1 style={{ cursor: CURSORS.text }}
                className="text-lg font-bold text-ink truncate hover:bg-hover-surface2 px-1 py-0.5 rounded transition-colors"
                onDoubleClick={handleTitleDoubleClick} title="Double-click to rename">
                {database.name}
              </h1>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button ref={filterBtnRef}
              onClick={() => {
                if (filters.length === 0) { setShowFilterPropertyPicker(!showFilterPropertyPicker); setShowFilterPanel(false); setShowAdvancedFilter(false); }
                else { setShowFilterPanel(!showFilterPanel); setShowFilterPropertyPicker(false); }
                setShowSortPanel(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${filters.length > 0
                ? 'bg-accent-soft text-accent-text-light font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`}>
              <Filter className="w-3.5 h-3.5" /><span className="hidden sm:inline">Filter</span>
              {filters.length > 0 && <span className="text-xs bg-accent-muted text-accent-text px-1.5 rounded-full tabular-nums">{filters.length}</span>}
            </button>
            <button onClick={() => { setShowSortPanel(!showSortPanel); setShowFilterPanel(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${sorts.length > 0
                ? 'bg-purple-surface text-purple-text font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`}>
              <ArrowUpDown className="w-3.5 h-3.5" /><span className="hidden sm:inline">Sort</span>
              {sorts.length > 0 && <span className="text-xs bg-purple-surface-muted text-purple-text-bold px-1.5 rounded-full tabular-nums">{sorts.length}</span>}
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface transition-colors">
              <Zap className="w-3.5 h-3.5" /><span className="hidden sm:inline">Automations</span>
            </button>

            {showSearch ? (
              <div className="flex items-center gap-1 bg-surface-tertiary rounded-lg px-2 py-1">
                <Search className="w-3.5 h-3.5 text-ink-muted" />
                <input ref={searchRef} type="text" placeholder="Search..." value={localSearchValue}
                  onChange={e => { const v = e.target.value; setLocalSearchValue(v); clearTimeout(searchDebounceRef.current); searchDebounceRef.current = setTimeout(() => store.setSearchQuery(v), 200); }}
                  onKeyDown={e => { if (e.key === 'Escape') { clearTimeout(searchDebounceRef.current); setLocalSearchValue(''); store.setSearchQuery(''); setShowSearch(false); } }}
                  className="bg-transparent text-sm w-40 outline-none placeholder:text-placeholder" />
                <button onClick={() => { clearTimeout(searchDebounceRef.current); setLocalSearchValue(''); store.setSearchQuery(''); setShowSearch(false); }} className="p-0.5 hover:bg-hover-surface3 rounded">
                  <X className="w-3 h-3 text-ink-muted" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)} className="p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors" title="Search">
                <Search className="w-4 h-4" />
              </button>
            )}

            <button onClick={() => setIsFullSize(!isFullSize)}
              className={`p-2 rounded-lg transition-colors ${isFullSize ? 'bg-surface-tertiary text-ink-body' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`} title="Full-size">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={() => setShowViewSettings(!showViewSettings)}
              className={`p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors ${showViewSettings ? 'bg-surface-tertiary' : ''}`}>
              <Settings2 className="w-4 h-4" />
            </button>
            <ExtraActionsMenu show={showExtraActions} onToggle={() => setShowExtraActions(!showExtraActions)} onClose={() => setShowExtraActions(false)} />
            <ThemeToggle />
            <div className="w-px h-5 bg-surface-muted mx-1" />
            <button onClick={() => { const id = addPage(database.id); store.openPage(id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-ink-inverse text-sm font-medium rounded-lg hover:bg-hover-accent transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>

        {/* ─── View tabs row ─── */}
        <div className="flex items-center px-4 py-1 border-t border-line-light">
          <div className="flex items-center gap-0.5 overflow-x-auto min-w-0 mr-1">
            {dbViews.map(v => (
              <div key={v.id} className="relative group">
                {renamingViewId === v.id ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                    {v.settings?.viewIcon ? <Icon name={v.settings.viewIcon} className="w-4 h-4" /> : VIEW_ICONS[v.type]}
                    <input ref={viewRenameRef} value={viewRenameValue} onChange={e => setViewRenameValue(e.target.value)}
                      onBlur={() => { if (viewRenameValue.trim()) updateView(v.id, { name: viewRenameValue.trim() }); setRenamingViewId(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') { if (viewRenameValue.trim()) updateView(v.id, { name: viewRenameValue.trim() }); setRenamingViewId(null); } if (e.key === 'Escape') setRenamingViewId(null); }}
                      className="text-sm font-medium text-ink bg-surface-primary border border-accent-border-light rounded px-1 py-0 outline-none w-28" />
                  </div>
                ) : (
                  <button ref={v.id === activeViewId ? activeTabBtnRef : undefined}
                    onClick={() => { if (v.id === activeViewId) setShowActiveViewMenu(!showActiveViewMenu); else { setActiveView(v.id); setShowActiveViewMenu(false); } }}
                    onContextMenu={e => { e.preventDefault(); setShowViewMenu(v.id); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${v.id === activeViewId
                      ? 'bg-surface-tertiary text-ink font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`}>
                    {v.settings?.viewIcon ? <Icon name={v.settings.viewIcon} className="w-4 h-4" /> : VIEW_ICONS[v.type]}
                    <span>{v.name}</span>
                  </button>
                )}
                {showViewMenu === v.id && (
                  <Dropdown onClose={() => setShowViewMenu(null)}>
                    <div className="p-1">
                      <button onClick={() => { setViewRenameValue(v.name); setRenamingViewId(v.id); setShowViewMenu(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-body hover:bg-hover-surface rounded-lg">
                        <PencilIcon className="w-3.5 h-3.5" /> Rename
                      </button>
                      <button onClick={() => { duplicateView(v.id); setShowViewMenu(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-body hover:bg-hover-surface rounded-lg">
                        <DuplicateIcon className="w-3.5 h-3.5" /> Duplicate
                      </button>
                      {dbViews.length > 1 && (
                        <button onClick={() => { deleteView(v.id); setShowViewMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-text hover:bg-hover-danger rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </Dropdown>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <div className="relative" ref={addViewRef}>
              <button onClick={() => { setShowAddView(!showAddView); setShowViewDots(false); }}
                className={`flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg transition-all ${showAddView
                  ? 'text-ink-body-light bg-surface-tertiary opacity-100'
                  : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface opacity-0 group-hover/header:opacity-100'}`}>
                <Plus className="w-3.5 h-3.5" />
              </button>
              {showAddView && (
                <div className="absolute top-full left-0 mt-1 bg-surface-primary border border-line rounded-xl shadow-lg z-50 overflow-hidden min-w-[200px] max-w-[240px]">
                  <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
                    <div className="p-2 flex flex-col gap-px">
                      <PanelSectionLabel>Add a new view</PanelSectionLabel>
                      <div className="flex flex-wrap gap-0.5">
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
              onEditTitle={() => { handleTitleDoubleClick(); setShowViewDots(false); }}
              onEditLayout={() => { setShowViewSettings(true); setShowViewDots(false); }}
              isHoverVisible={showViewDots} />
          </div>
        </div>

        {/* ─── Filter bar / portals ─── */}
        {(showFilterPanel || filters.length > 0) && filters.length > 0 && (
          <FilterBar filters={filters} properties={database.properties}
            conjunction={view.filterConjunction || 'and'} viewId={view.id}
            onOpenAdvanced={() => setShowAdvancedFilter(true)} />
        )}
        {showFilterPropertyPicker && filterBtnRef.current && createPortal(
          <div className="fixed z-[9999]"
            style={{ top: filterBtnRef.current.getBoundingClientRect().bottom + 4, left: filterBtnRef.current.getBoundingClientRect().left }}>
            <div className="bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden"
              ref={el => { if (!el) return; const handler = (e: MouseEvent) => { if (!el.contains(e.target as Node)) setShowFilterPropertyPicker(false); };
                if (!el.dataset.listening) { el.dataset.listening = '1'; setTimeout(() => document.addEventListener('mousedown', handler), 0); } }}>
              <FilterPropertyPicker properties={Object.values(database.properties) as SchemaProperty[]}
                onSelect={propId => { const prop = database.properties[propId]; const ops = getOperatorsForType(prop?.type || 'text');
                  store.addFilter(view.id, { propertyId: propId, operator: ops[0].value, value: '' }); setShowFilterPropertyPicker(false); setShowFilterPanel(true); }}
                onClose={() => setShowFilterPropertyPicker(false)}
                onAdvancedFilter={() => { setShowFilterPropertyPicker(false); setShowAdvancedFilter(true); }} />
            </div>
          </div>, document.body
        )}
        {showAdvancedFilter && createPortal(
          <div ref={advancedFilterRef}
            className="fixed z-[9999] bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden"
            style={{ top: 140, left: '50%', transform: 'translateX(-50%)', minWidth: 520 }}>
            <AdvancedFilterGrid filters={filters} properties={database.properties}
              conjunction={view.filterConjunction || 'and'}
              onAddFilter={propId => { const prop = database.properties[propId]; const ops = getOperatorsForType(prop?.type || 'text');
                store.addFilter(view.id, { propertyId: propId, operator: ops[0].value, value: '' }); }}
              onUpdateFilter={(filterId, updates) => store.updateFilter(view.id, filterId, updates)}
              onRemoveFilter={filterId => store.removeFilter(view.id, filterId)}
              onDeleteAll={() => { store.clearFilters(view.id); setShowAdvancedFilter(false); setShowFilterPanel(false); }}
              onClose={() => setShowAdvancedFilter(false)} />
          </div>, document.body
        )}
        {showSortPanel && (
          <div className="px-4 pb-2">
            <div className="bg-surface-primary border border-line rounded-xl shadow-lg w-full max-w-[420px]">
              <SortPanel database={database} view={view} />
            </div>
          </div>
        )}
      </div>

      {showViewSettings && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowViewSettings(false)}>
          <div className="w-80 bg-surface-primary border-l border-line shadow-xl h-full overflow-auto" onClick={e => e.stopPropagation()}>
            <ViewSettingsPanel onClose={() => setShowViewSettings(false)} />
          </div>
        </div>
      )}

      <ActiveViewMenu show={showActiveViewMenu} onClose={() => setShowActiveViewMenu(false)}
        btnRef={activeTabBtnRef} menuRef={activeViewMenuRef} view={view} dbViewsLength={dbViews.length}
        onRename={() => { setViewRenameValue(view.name); setRenamingViewId(view.id); setShowActiveViewMenu(false); }}
        onEditView={() => { setShowViewSettings(true); setShowActiveViewMenu(false); }}
        onDuplicate={() => { duplicateView(view.id); setShowActiveViewMenu(false); }}
        onDelete={() => { deleteView(view.id); setShowActiveViewMenu(false); }} />
    </>
  );
}
