import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { ViewSettingsPanel } from './ViewSettingsPanel';
import { MenuRow, MenuDivider, ViewTypeCard, PanelSectionLabel } from './ui/MenuPrimitives';
import { ActionPanel, type PanelSection } from './ui/ActionPanel';
import { CURSORS } from './ui/cursors';
import {
  TableIcon, BoardIcon, GalleryIcon, ListIcon, ChartIcon,
  DashboardIcon, TimelineIcon, FeedIcon, MapViewIcon, CalendarIcon,
  CopyLinkIcon, DuplicateIcon, ExternalLinkIcon, PencilIcon,
  EmojiFaceIcon, LayoutIcon, EyeSlashIcon, NewDataSourceIcon,
} from './ui/Icons';
import { Icon } from './ui/Icon';
import {
  Plus, Search, Filter, ArrowUpDown, Settings2, ChevronDown,
  Table, Kanban, Calendar, Clock, List, LayoutGrid, BarChart3, Rss, Map, LayoutDashboard,
  Trash2, Copy, X, ArrowUp, ArrowDown, Maximize2, Zap,
  MoreHorizontal, Download, Upload, Link2, Printer
} from 'lucide-react';
import type { ViewType, SchemaProperty } from '../types/database';
import {
  getOperatorsForType,
  FilterPropertyPicker, FilterBar, AdvancedFilterGrid,
} from './FilterComponents';
import { ThemeToggle } from './ui/ThemeToggle';

const VIEW_ICONS: Record<ViewType, React.ReactNode> = {
  table: <Table className="w-4 h-4" />,
  board: <Kanban className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  timeline: <Clock className="w-4 h-4" />,
  list: <List className="w-4 h-4" />,
  gallery: <LayoutGrid className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  feed: <Rss className="w-4 h-4" />,
  map: <Map className="w-4 h-4" />,
  dashboard: <LayoutDashboard className="w-4 h-4" />,
};

/** Notion-authentic SVG icons for view type cards */
const VIEW_TYPE_CARD_ICONS: Record<ViewType, React.ReactNode> = {
  table: <TableIcon />,
  board: <BoardIcon />,
  gallery: <GalleryIcon />,
  list: <ListIcon />,
  chart: <ChartIcon />,
  dashboard: <DashboardIcon />,
  timeline: <TimelineIcon />,
  feed: <FeedIcon />,
  map: <MapViewIcon />,
  calendar: <CalendarIcon />,
};

/** Order for the "Add a new view" grid (matches Notion's layout) */
const VIEW_TYPE_ORDER: ViewType[] = [
  'table', 'board', 'gallery', 'list', 'chart',
  'dashboard', 'timeline', 'feed', 'map', 'calendar',
];

const VIEW_LABELS: Record<ViewType, string> = {
  table: 'Table', board: 'Board', calendar: 'Calendar', timeline: 'Timeline',
  list: 'List', gallery: 'Gallery', chart: 'Chart', feed: 'Feed', map: 'Map', dashboard: 'Dashboard',
};

export function TopBar() {
  const activeViewId = useDatabaseStore(s => s.activeViewId);
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const searchQuery = useDatabaseStore(s => s.searchQuery);
  const { addView, setActiveView, deleteView, duplicateView,
    addPage, renameDatabase, updateView } = useDatabaseStore.getState();
  const store = useDatabaseStore.getState();

  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

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
  const searchRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const addViewRef = useRef<HTMLDivElement>(null);
  const viewDotsRef = useRef<HTMLDivElement>(null);
  const activeViewMenuRef = useRef<HTMLDivElement>(null);
  const activeTabBtnRef = useRef<HTMLButtonElement>(null);
  const viewRenameRef = useRef<HTMLInputElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const advancedFilterRef = useRef<HTMLDivElement>(null);

  const dbViews = database
    ? Object.values(views).filter(v => v.databaseId === database.id)
    : [];

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditingTitle]);

  // Outside-click handlers for + and ··· panels (includes trigger button in boundary)
  useEffect(() => {
    if (!showAddView) return;
    const handler = (e: MouseEvent) => {
      if (addViewRef.current && !addViewRef.current.contains(e.target as Node)) {
        setShowAddView(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddView]);

  useEffect(() => {
    if (!showViewDots) return;
    const handler = (e: MouseEvent) => {
      if (viewDotsRef.current && !viewDotsRef.current.contains(e.target as Node)) {
        setShowViewDots(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showViewDots]);

  useEffect(() => {
    if (!showActiveViewMenu) return;
    const handler = (e: MouseEvent) => {
      if (activeViewMenuRef.current && !activeViewMenuRef.current.contains(e.target as Node)) {
        setShowActiveViewMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showActiveViewMenu]);

  useEffect(() => {
    if (!showAdvancedFilter) return;
    const handler = (e: MouseEvent) => {
      if (advancedFilterRef.current && !advancedFilterRef.current.contains(e.target as Node)) {
        setShowAdvancedFilter(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAdvancedFilter]);

  useEffect(() => {
    if (renamingViewId && viewRenameRef.current) {
      viewRenameRef.current.focus();
      viewRenameRef.current.select();
    }
  }, [renamingViewId]);

  if (!view || !database) return null;

  const filters = view.filters || [];
  const sorts = view.sorts || [];

  const handleTitleDoubleClick = () => {
    setTitleValue(database.name);
    setIsEditingTitle(true);
  };

  const commitTitle = () => {
    if (titleValue.trim()) {
      renameDatabase(database.id, titleValue.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <>
      <div className="bg-surface-primary border-b border-line flex flex-col group/header">
        {/* ─── Top row: Editable title + action buttons ─── */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Icon + editable database title */}
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
              <input
                ref={titleRef}
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="text-lg font-bold text-ink outline-none bg-transparent border-b-2 border-accent-border px-0.5 min-w-[120px]"
              />
            ) : (
              <h1
                style={{ cursor: CURSORS.text }}
                className="text-lg font-bold text-ink truncate hover:bg-hover-surface2 px-1 py-0.5 rounded transition-colors"
                onDoubleClick={handleTitleDoubleClick}
                title="Double-click to rename"
              >
                {database.name}
              </h1>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              ref={filterBtnRef}
              onClick={() => {
                if (filters.length === 0) {
                  // No filters → show property picker dropdown
                  setShowFilterPropertyPicker(!showFilterPropertyPicker);
                  setShowFilterPanel(false);
                  setShowAdvancedFilter(false);
                } else {
                  // Filters exist → toggle the filter bar
                  setShowFilterPanel(!showFilterPanel);
                  setShowFilterPropertyPicker(false);
                }
                setShowSortPanel(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${filters.length > 0
                ? 'bg-accent-soft text-accent-text-light font-medium'
                : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'
                }`}>
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filter</span>
              {filters.length > 0 && <span className="text-xs bg-accent-muted text-accent-text px-1.5 rounded-full tabular-nums">{filters.length}</span>}
            </button>

            <button onClick={() => { setShowSortPanel(!showSortPanel); setShowFilterPanel(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${sorts.length > 0
                ? 'bg-purple-surface text-purple-text font-medium'
                : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'
                }`}>
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sort</span>
              {sorts.length > 0 && <span className="text-xs bg-purple-surface-muted text-purple-text-bold px-1.5 rounded-full tabular-nums">{sorts.length}</span>}
            </button>

            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface transition-colors">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Automations</span>
            </button>

            {showSearch ? (
              <div className="flex items-center gap-1 bg-surface-tertiary rounded-lg px-2 py-1">
                <Search className="w-3.5 h-3.5 text-ink-muted" />
                <input ref={searchRef}
                  type="text" placeholder="Search..."
                  value={localSearchValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocalSearchValue(v);
                    clearTimeout(searchDebounceRef.current);
                    searchDebounceRef.current = setTimeout(() => store.setSearchQuery(v), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      clearTimeout(searchDebounceRef.current);
                      setLocalSearchValue('');
                      store.setSearchQuery('');
                      setShowSearch(false);
                    }
                  }}
                  className="bg-transparent text-sm w-40 outline-none placeholder:text-placeholder" />
                <button onClick={() => {
                  clearTimeout(searchDebounceRef.current);
                  setLocalSearchValue('');
                  store.setSearchQuery('');
                  setShowSearch(false);
                }}
                  className="p-0.5 hover:bg-hover-surface3 rounded">
                  <X className="w-3 h-3 text-ink-muted" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)}
                className="p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors" title="Search">
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsFullSize(!isFullSize)}
              className={`p-2 rounded-lg transition-colors ${isFullSize ? 'bg-surface-tertiary text-ink-body' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`}
              title="Full-size">
              <Maximize2 className="w-4 h-4" />
            </button>

            <button onClick={() => setShowViewSettings(!showViewSettings)}
              className={`p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors ${showViewSettings ? 'bg-surface-tertiary' : ''}`}>
              <Settings2 className="w-4 h-4" />
            </button>

            {/* ··· Extra actions menu */}
            <ExtraActionsMenu
              show={showExtraActions}
              onToggle={() => setShowExtraActions(!showExtraActions)}
              onClose={() => setShowExtraActions(false)}
            />

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
          {/* Scrollable tab list — no flex-1 so +/··· buttons sit right after the last tab */}
          <div className="flex items-center gap-0.5 overflow-x-auto min-w-0 mr-1">
            {dbViews.map(v => (
              <div key={v.id} className="relative group">
                {renamingViewId === v.id ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                    {v.settings?.viewIcon
                      ? <Icon name={v.settings.viewIcon} className="w-4 h-4" />
                      : VIEW_ICONS[v.type]}
                    <input
                      ref={viewRenameRef}
                      value={viewRenameValue}
                      onChange={e => setViewRenameValue(e.target.value)}
                      onBlur={() => {
                        if (viewRenameValue.trim()) updateView(v.id, { name: viewRenameValue.trim() });
                        setRenamingViewId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (viewRenameValue.trim()) updateView(v.id, { name: viewRenameValue.trim() });
                          setRenamingViewId(null);
                        }
                        if (e.key === 'Escape') setRenamingViewId(null);
                      }}
                      className="text-sm font-medium text-ink bg-surface-primary border border-accent-border-light rounded px-1 py-0 outline-none w-28"
                    />
                  </div>
                ) : (
                  <button
                    ref={v.id === activeViewId ? activeTabBtnRef : undefined}
                    onClick={() => {
                      if (v.id === activeViewId) {
                        setShowActiveViewMenu(!showActiveViewMenu);
                      } else {
                        setActiveView(v.id);
                        setShowActiveViewMenu(false);
                      }
                    }}
                    onContextMenu={(e) => { e.preventDefault(); setShowViewMenu(v.id); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${v.id === activeViewId
                      ? 'bg-surface-tertiary text-ink font-medium'
                      : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'
                      }`}>
                    {v.settings?.viewIcon
                      ? <Icon name={v.settings.viewIcon} className="w-4 h-4" />
                      : VIEW_ICONS[v.type]}
                    <span>{v.name}</span>
                  </button>
                )}

                {/* Active view context menu rendered via portal to avoid overflow clipping */}

                {/* Right-click context menu (for non-active tabs) */}
                {showViewMenu === v.id && (
                  <Dropdown onClose={() => setShowViewMenu(null)}>
                    <div className="p-1">
                      <button onClick={() => {
                        setViewRenameValue(v.name);
                        setRenamingViewId(v.id);
                        setShowViewMenu(null);
                      }}
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

          {/* + and ··· buttons — OUTSIDE the overflow container so dropdowns aren't clipped */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* + Add a new view (hover-only, visible when open) */}
            <div className="relative" ref={addViewRef}>
              <button onClick={() => { setShowAddView(!showAddView); setShowViewDots(false); }}
                className={`flex items-center gap-1 px-2 py-1.5 text-sm rounded-lg transition-all
                  ${showAddView
                    ? 'text-ink-body-light bg-surface-tertiary opacity-100'
                    : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface opacity-0 group-hover/header:opacity-100'
                  }`}>
                <Plus className="w-3.5 h-3.5" />
              </button>
              {showAddView && (
                <div className="absolute top-full left-0 mt-1 bg-surface-primary border border-line rounded-xl shadow-lg z-50 overflow-hidden min-w-[200px] max-w-[240px]">
                  <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
                    <div className="p-2 flex flex-col gap-px">
                      <PanelSectionLabel>Add a new view</PanelSectionLabel>
                      <div className="flex flex-wrap gap-0.5">
                        {VIEW_TYPE_ORDER.map(type => (
                          <ViewTypeCard
                            key={type}
                            icon={VIEW_TYPE_CARD_ICONS[type]}
                            label={VIEW_LABELS[type]}
                            active={view.type === type}
                            onClick={() => {
                              // Smart defaults: auto-group board views by priority/status/select property
                              let defaultGrouping: { propertyId: string } | undefined;
                              if (type === 'board') {
                                const props = Object.values(database.properties);
                                const priorityProp = props.find(p => p.name.toLowerCase().includes('priority') && (p.type === 'select' || p.type === 'status'));
                                const statusProp = props.find(p => p.type === 'status');
                                const firstSelectProp = props.find(p => p.type === 'select' || p.type === 'status');
                                const groupProp = priorityProp || statusProp || firstSelectProp;
                                if (groupProp) defaultGrouping = { propertyId: groupProp.id };
                              }
                              addView({
                                databaseId: database.id,
                                name: VIEW_LABELS[type],
                                type,
                                filters: [],
                                filterConjunction: 'and',
                                sorts: [],
                                ...(defaultGrouping ? { grouping: defaultGrouping } : {}),
                                visibleProperties: Object.keys(database.properties),
                                settings: {},
                              });
                              setShowAddView(false);
                            }}
                          />
                        ))}
                      </div>
                      <MenuDivider />
                      <MenuRow icon={<NewDataSourceIcon />} label="New data source" onClick={() => setShowAddView(false)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ··· View context menu (hover-only, visible when open) */}
            <ViewDotsMenu
              show={showViewDots}
              onToggle={() => { setShowViewDots(!showViewDots); setShowAddView(false); }}
              onClose={() => setShowViewDots(false)}
              containerRef={viewDotsRef}
              onDuplicate={() => { duplicateView(view.id); setShowViewDots(false); }}
              onEditTitle={() => { handleTitleDoubleClick(); setShowViewDots(false); }}
              onEditLayout={() => { setShowViewSettings(true); setShowViewDots(false); }}
              isHoverVisible={showViewDots}
            />
          </div>
        </div>

        {/* ─── Inline Filter Bar (when filters exist) ─── */}
        {(showFilterPanel || filters.length > 0) && filters.length > 0 && (
          <FilterBar
            filters={filters}
            properties={database.properties}
            conjunction={view.filterConjunction || 'and'}
            viewId={view.id}
            onOpenAdvanced={() => setShowAdvancedFilter(true)}
          />
        )}

        {/* ─── Property Picker dropdown (when filter button clicked with no filters) ─── */}
        {showFilterPropertyPicker && filterBtnRef.current && createPortal(
          <div
            className="fixed z-[9999]"
            style={{
              top: filterBtnRef.current.getBoundingClientRect().bottom + 4,
              left: filterBtnRef.current.getBoundingClientRect().left,
            }}
          >
            <div className="bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden"
              ref={el => {
                if (!el) return;
                const handler = (e: MouseEvent) => {
                  if (!el.contains(e.target as Node)) setShowFilterPropertyPicker(false);
                };
                // Use a one-time setup trick via data attribute
                if (!el.dataset.listening) {
                  el.dataset.listening = '1';
                  setTimeout(() => document.addEventListener('mousedown', handler), 0);
                  // Cleanup when unmounted via MutationObserver fallback not needed for portals
                }
              }}
            >
              <FilterPropertyPicker
                properties={Object.values(database.properties) as SchemaProperty[]}
                onSelect={propId => {
                  const prop = database.properties[propId];
                  const ops = getOperatorsForType(prop?.type || 'text');
                  store.addFilter(view.id, { propertyId: propId, operator: ops[0].value, value: '' });
                  setShowFilterPropertyPicker(false);
                  setShowFilterPanel(true);
                }}
                onClose={() => setShowFilterPropertyPicker(false)}
                onAdvancedFilter={() => {
                  setShowFilterPropertyPicker(false);
                  setShowAdvancedFilter(true);
                }}
              />
            </div>
          </div>,
          document.body
        )}

        {/* ─── Advanced Filter Grid (portal) ─── */}
        {showAdvancedFilter && createPortal(
          <div
            ref={advancedFilterRef}
            className="fixed z-[9999] bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden"
            style={{ top: 140, left: '50%', transform: 'translateX(-50%)', minWidth: 520 }}
          >
              <AdvancedFilterGrid
                filters={filters}
                properties={database.properties}
                conjunction={view.filterConjunction || 'and'}
                onAddFilter={propId => {
                  const prop = database.properties[propId];
                  const ops = getOperatorsForType(prop?.type || 'text');
                  store.addFilter(view.id, { propertyId: propId, operator: ops[0].value, value: '' });
                }}
                onUpdateFilter={(filterId, updates) => store.updateFilter(view.id, filterId, updates)}
                onRemoveFilter={filterId => store.removeFilter(view.id, filterId)}
                onDeleteAll={() => { store.clearFilters(view.id); setShowAdvancedFilter(false); setShowFilterPanel(false); }}
                onClose={() => setShowAdvancedFilter(false)}
              />
          </div>,
          document.body
        )}

        {/* ─── Sort panel ─── */}
        {showSortPanel && (
          <div className="px-4 pb-2">
            <div className="bg-surface-primary border border-line rounded-xl shadow-lg w-full max-w-[420px]">
              <SortPanel database={database} view={view} />
            </div>
          </div>
        )}
      </div>

      {/* Settings panel (slides in from right) */}
      {showViewSettings && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowViewSettings(false)}>
          <div className="w-80 bg-surface-primary border-l border-line shadow-xl h-full overflow-auto" onClick={e => e.stopPropagation()}>
            <ViewSettingsPanel onClose={() => setShowViewSettings(false)} />
          </div>
        </div>
      )}

      {/* Active view context menu — portal to avoid overflow clipping */}
      {showActiveViewMenu && activeTabBtnRef.current && (() => {
        const btnRect = activeTabBtnRef.current!.getBoundingClientRect();
        return createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setShowActiveViewMenu(false)} />
            <div
              ref={activeViewMenuRef}
              className="fixed z-[9999] w-[220px] bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden"
              style={{ top: btnRect.bottom + 4, left: btnRect.left }}>
              <div className="flex flex-col">
                {/* Section 1: Rename, Edit view, Source */}
                <div className="p-1 flex flex-col gap-px">
                  <button onClick={() => {
                    setViewRenameValue(view.name);
                    setRenamingViewId(view.id);
                    setShowActiveViewMenu(false);
                  }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
                    <PencilIcon className="w-4 h-4" /> Rename
                  </button>
                  <button onClick={() => { setShowViewSettings(true); setShowActiveViewMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
                    <LayoutIcon className="w-4 h-4" /> Edit view
                  </button>
                  <button onClick={() => setShowActiveViewMenu(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
                    <ExternalLinkIcon className="w-4 h-4" />
                    <span className="flex-1 text-left">Source</span>
                    <ChevronDown className="w-3 h-3 text-ink-muted -rotate-90" />
                  </button>
                </div>

                <div className="mx-3 h-px bg-surface-tertiary" />

                {/* Section 2: Copy link, Open source, Hide titles */}
                <div className="p-1 flex flex-col gap-px">
                  <button onClick={() => {
                    navigator.clipboard?.writeText(window.location.href + '?view=' + view.id);
                    setShowActiveViewMenu(false);
                  }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
                    <CopyLinkIcon className="w-4 h-4" /> Copy link to view
                  </button>
                  <button onClick={() => setShowActiveViewMenu(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
                    <ExternalLinkIcon className="w-4 h-4" /> Open source database
                  </button>
                  <button onClick={() => setShowActiveViewMenu(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
                    <EyeSlashIcon className="w-4 h-4" /> Hide data source titles
                  </button>
                </div>

                <div className="mx-3 h-px bg-surface-tertiary" />

                {/* Section 3: Duplicate, Delete */}
                <div className="p-1 flex flex-col gap-px">
                  <button onClick={() => { duplicateView(view.id); setShowActiveViewMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
                    <DuplicateIcon className="w-4 h-4" /> Duplicate view
                  </button>
                  {dbViews.length > 1 && (
                    <button onClick={() => { deleteView(view.id); setShowActiveViewMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-danger-text hover:bg-hover-danger transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete view
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>,
          document.body
        );
      })()}
    </>
  );
}

/* --- SortPanel --- */
function SortPanel({ database, view }: { database: any; view: any }) {
  const { addSort, updateSort, removeSort, clearSorts } = useDatabaseStore.getState();
  const allProps = Object.values(database.properties) as SchemaProperty[];
  const sorts = view.sorts || [];

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-ink-body">Sorts</span>
        {sorts.length > 0 && (
          <button onClick={() => clearSorts(view.id)} className="text-xs text-danger-text-soft hover:text-hover-danger-text-bold">Clear all</button>
        )}
      </div>

      {sorts.map((sort: any) => (
        <div key={sort.id} className="flex items-center gap-2 text-sm">
          <select value={sort.propertyId}
            onChange={(e) => updateSort(view.id, sort.id, { propertyId: e.target.value })}
            className="px-2 py-1.5 border border-line rounded-lg bg-surface-primary text-sm flex-1">
            {allProps.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button onClick={() => updateSort(view.id, sort.id, { direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 border border-line rounded-lg text-sm transition-colors hover:bg-hover-surface ${sort.direction === 'asc' ? 'text-accent-text-light' : 'text-purple-text'}`}>
            {sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {sort.direction === 'asc' ? 'Ascending' : 'Descending'}
          </button>

          <button onClick={() => removeSort(view.id, sort.id)}
            className="p-1 text-ink-muted hover:text-hover-danger-text rounded hover:bg-hover-surface transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <button onClick={() => { const firstProp = allProps[0]; if (firstProp) addSort(view.id, { propertyId: firstProp.id, direction: 'asc' }); }}
        className="flex items-center gap-1.5 text-sm text-accent-text-soft hover:text-hover-accent-text py-1 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add sort
      </button>
    </div>
  );
}

/* --- ExtraActionsMenu (··· in top row) — uses ActionPanel --- */
function ExtraActionsMenu({ show, onToggle, onClose }: { show: boolean; onToggle: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, onClose]);

  const sections: PanelSection[] = useMemo(() => [
    {
      items: [
        { icon: <DuplicateIcon />, label: 'Duplicate database', onClick: onClose },
        { icon: <CopyLinkIcon />, label: 'Copy link', onClick: onClose },
        { icon: <Download className="w-[18px] h-[18px]" />, label: 'Export', onClick: onClose },
        { icon: <Upload className="w-[18px] h-[18px]" />, label: 'Import', onClick: onClose },
        { icon: <Printer className="w-[18px] h-[18px]" />, label: 'Print', onClick: onClose },
      ],
    },
    {
      items: [
        { icon: <Trash2 className="w-[18px] h-[18px]" />, label: 'Delete database', danger: true, onClick: onClose },
      ],
    },
  ], [onClose]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={onToggle}
        className={`p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors ${show ? 'bg-surface-tertiary' : ''}`}
        title="More actions">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute top-full right-0 mt-1 z-50">
          <ActionPanel sections={sections} width={220} />
        </div>
      )}
    </div>
  );
}

/* --- ViewDotsMenu (··· in view tabs row) — uses ActionPanel --- */
function ViewDotsMenu({
  show, onToggle, onClose, containerRef,
  onDuplicate, onEditTitle, onEditLayout, isHoverVisible,
}: {
  show: boolean; onToggle: () => void; onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDuplicate: () => void; onEditTitle: () => void; onEditLayout: () => void;
  isHoverVisible: boolean;
}) {
  const sections: PanelSection[] = useMemo(() => [
    {
      items: [
        { icon: <CopyLinkIcon />, label: 'Copy link to view', onClick: onClose },
        { icon: <DuplicateIcon />, label: 'Duplicate view', onClick: onDuplicate },
      ],
    },
    {
      items: [
        { icon: <ExternalLinkIcon />, label: 'View data source', onClick: onClose },
        { icon: <PencilIcon />, label: 'Edit title', onClick: onEditTitle },
        { icon: <EmojiFaceIcon />, label: 'Edit icon', onClick: onClose },
        { icon: <LayoutIcon />, label: 'Edit layout', onClick: onEditLayout },
      ],
    },
    {
      items: [
        { icon: <EyeSlashIcon />, label: 'Hide title', onClick: onClose },
      ],
    },
  ], [onClose, onDuplicate, onEditTitle, onEditLayout]);

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={onToggle}
        className={`flex items-center px-1.5 py-1.5 text-sm rounded-lg transition-all
          ${show
            ? 'bg-surface-tertiary text-ink-body-light opacity-100'
            : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface opacity-0 group-hover/header:opacity-100'
          }`}>
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <ActionPanel sections={sections} width={240} />
        </div>
      )}
    </div>
  );
}

/* --- Dropdown wrapper --- */
function Dropdown({ children, onClose, className = '' }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref}
      className={`absolute top-full left-0 mt-1 bg-surface-primary border border-line rounded-xl shadow-lg z-50 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
