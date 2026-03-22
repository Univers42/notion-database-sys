import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import type { ViewType, FilterOperator, SchemaProperty } from '../types/database';

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

const FILTER_OPERATORS: Record<string, { label: string; value: FilterOperator }[]> = {
  text: [
    { label: 'equals', value: 'equals' }, { label: 'not equals', value: 'not_equals' },
    { label: 'contains', value: 'contains' }, { label: 'does not contain', value: 'not_contains' },
    { label: 'starts with', value: 'starts_with' }, { label: 'ends with', value: 'ends_with' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  title: [
    { label: 'contains', value: 'contains' }, { label: 'does not contain', value: 'not_contains' },
    { label: 'equals', value: 'equals' }, { label: 'is empty', value: 'is_empty' },
    { label: 'is not empty', value: 'is_not_empty' },
  ],
  number: [
    { label: '=', value: 'equals' }, { label: '≠', value: 'not_equals' },
    { label: '>', value: 'greater_than' }, { label: '<', value: 'less_than' },
    { label: '≥', value: 'greater_than_or_equal' }, { label: '≤', value: 'less_than_or_equal' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  select: [
    { label: 'is', value: 'equals' }, { label: 'is not', value: 'not_equals' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  status: [
    { label: 'is', value: 'equals' }, { label: 'is not', value: 'not_equals' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  multi_select: [
    { label: 'contains', value: 'contains' }, { label: 'does not contain', value: 'not_contains' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  date: [
    { label: 'is', value: 'equals' }, { label: 'is before', value: 'is_before' },
    { label: 'is after', value: 'is_after' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  checkbox: [
    { label: 'is checked', value: 'is_checked' }, { label: 'is not checked', value: 'is_not_checked' },
  ],
  user: [
    { label: 'is', value: 'equals' }, { label: 'is not', value: 'not_equals' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  person: [
    { label: 'is', value: 'equals' }, { label: 'is not', value: 'not_equals' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  url: [
    { label: 'equals', value: 'equals' }, { label: 'contains', value: 'contains' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  email: [
    { label: 'equals', value: 'equals' }, { label: 'contains', value: 'contains' },
    { label: 'is empty', value: 'is_empty' }, { label: 'is not empty', value: 'is_not_empty' },
  ],
  phone: [
    { label: 'equals', value: 'equals' }, { label: 'is empty', value: 'is_empty' },
  ],
  created_time: [
    { label: 'is before', value: 'is_before' }, { label: 'is after', value: 'is_after' },
  ],
  last_edited_time: [
    { label: 'is before', value: 'is_before' }, { label: 'is after', value: 'is_after' },
  ],
};

function getOperatorsForType(type: string) {
  return FILTER_OPERATORS[type] || FILTER_OPERATORS.text;
}

function needsValue(op: FilterOperator) {
  return !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(op);
}

export function TopBar() {
  const activeViewId = useDatabaseStore(s => s.activeViewId);
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const { addView, setActiveView, deleteView, duplicateView,
    addPage, renameDatabase, updateView } = useDatabaseStore.getState();

  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const [showSearch, setShowSearch] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
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
  const viewRenameRef = useRef<HTMLInputElement>(null);

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
      <div className="bg-white border-b border-gray-200 flex flex-col group/header">
        {/* ─── Top row: Editable title + action buttons ─── */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Icon + editable database title */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative">
              <button onClick={() => setShowDbSwitcher(!showDbSwitcher)}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                {database.icon && <span className="text-lg">{database.icon}</span>}
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
              {showDbSwitcher && (
                <Dropdown onClose={() => setShowDbSwitcher(false)}>
                  <div className="py-1">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Databases</div>
                    {Object.values(databases).map(db => (
                      <button key={db.id} onClick={() => {
                        const firstView = Object.values(views).find(v => v.databaseId === db.id);
                        if (firstView) setActiveView(firstView.id);
                        setShowDbSwitcher(false);
                      }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${db.id === database.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
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
                className="text-lg font-bold text-gray-900 outline-none bg-transparent border-b-2 border-blue-500 px-0.5 min-w-[120px]"
              />
            ) : (
              <h1
                style={{ cursor: CURSORS.text }}
                className="text-lg font-bold text-gray-900 truncate hover:bg-gray-100 px-1 py-0.5 rounded transition-colors"
                onDoubleClick={handleTitleDoubleClick}
                title="Double-click to rename"
              >
                {database.name}
              </h1>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => { setShowFilterPanel(!showFilterPanel); setShowSortPanel(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${filters.length > 0
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filter</span>
              {filters.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded-full tabular-nums">{filters.length}</span>}
            </button>

            <button onClick={() => { setShowSortPanel(!showSortPanel); setShowFilterPanel(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${sorts.length > 0
                ? 'bg-purple-50 text-purple-600 font-medium'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sort</span>
              {sorts.length > 0 && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded-full tabular-nums">{sorts.length}</span>}
            </button>

            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Automations</span>
            </button>

            {showSearch ? (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input ref={searchRef}
                  type="text" placeholder="Search..."
                  value={store.searchQuery}
                  onChange={(e) => store.setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { store.setSearchQuery(''); setShowSearch(false); } }}
                  className="bg-transparent text-sm w-40 outline-none placeholder:text-gray-400" />
                <button onClick={() => { store.setSearchQuery(''); setShowSearch(false); }}
                  className="p-0.5 hover:bg-gray-200 rounded">
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors" title="Search">
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsFullSize(!isFullSize)}
              className={`p-2 rounded-lg transition-colors ${isFullSize ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              title="Full-size">
              <Maximize2 className="w-4 h-4" />
            </button>

            <button onClick={() => setShowViewSettings(!showViewSettings)}
              className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${showViewSettings ? 'bg-gray-100' : ''}`}>
              <Settings2 className="w-4 h-4" />
            </button>

            {/* ··· Extra actions menu */}
            <ExtraActionsMenu
              show={showExtraActions}
              onToggle={() => setShowExtraActions(!showExtraActions)}
              onClose={() => setShowExtraActions(false)}
            />

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <button onClick={() => { const id = addPage(database.id); store.openPage(id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>

        {/* ─── View tabs row ─── */}
        <div className="flex items-center px-4 py-1 border-t border-gray-100">
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
                      className="text-sm font-medium text-gray-900 bg-white border border-blue-400 rounded px-1 py-0 outline-none w-28"
                    />
                  </div>
                ) : (
                  <button
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
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}>
                    {v.settings?.viewIcon
                      ? <Icon name={v.settings.viewIcon} className="w-4 h-4" />
                      : VIEW_ICONS[v.type]}
                    <span>{v.name}</span>
                  </button>
                )}

                {/* Active view context menu (click on active tab) */}
                {v.id === activeViewId && showActiveViewMenu && (
                  <div ref={activeViewMenuRef}
                    className="absolute top-full left-0 mt-1 z-50 w-[220px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="flex flex-col">
                      {/* Section 1: Rename, Edit view, Source */}
                      <div className="p-1 flex flex-col gap-px">
                        <button onClick={() => {
                          setViewRenameValue(v.name);
                          setRenamingViewId(v.id);
                          setShowActiveViewMenu(false);
                        }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <PencilIcon className="w-4 h-4" /> Rename
                        </button>
                        <button onClick={() => { setShowViewSettings(true); setShowActiveViewMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <LayoutIcon className="w-4 h-4" /> Edit view
                        </button>
                        <button onClick={() => setShowActiveViewMenu(false)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <ExternalLinkIcon className="w-4 h-4" />
                          <span className="flex-1 text-left">Source</span>
                          <ChevronDown className="w-3 h-3 text-gray-400 -rotate-90" />
                        </button>
                      </div>

                      <div className="mx-3 h-px bg-gray-100" />

                      {/* Section 2: Copy link, Open source, Hide titles */}
                      <div className="p-1 flex flex-col gap-px">
                        <button onClick={() => {
                          navigator.clipboard?.writeText(window.location.href + '?view=' + v.id);
                          setShowActiveViewMenu(false);
                        }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <CopyLinkIcon className="w-4 h-4" /> Copy link to view
                        </button>
                        <button onClick={() => setShowActiveViewMenu(false)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <ExternalLinkIcon className="w-4 h-4" /> Open source database
                        </button>
                        <button onClick={() => setShowActiveViewMenu(false)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <EyeSlashIcon className="w-4 h-4" /> Hide data source titles
                        </button>
                      </div>

                      <div className="mx-3 h-px bg-gray-100" />

                      {/* Section 3: Duplicate, Delete */}
                      <div className="p-1 flex flex-col gap-px">
                        <button onClick={() => { duplicateView(v.id); setShowActiveViewMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <DuplicateIcon className="w-4 h-4" /> Duplicate view
                        </button>
                        {dbViews.length > 1 && (
                          <button onClick={() => { deleteView(v.id); setShowActiveViewMenu(false); }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Delete view
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Right-click context menu (for non-active tabs) */}
                {showViewMenu === v.id && (
                  <Dropdown onClose={() => setShowViewMenu(null)}>
                    <div className="p-1">
                      <button onClick={() => {
                        setViewRenameValue(v.name);
                        setRenamingViewId(v.id);
                        setShowViewMenu(null);
                      }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                        <PencilIcon className="w-3.5 h-3.5" /> Rename
                      </button>
                      <button onClick={() => { duplicateView(v.id); setShowViewMenu(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                        <DuplicateIcon className="w-3.5 h-3.5" /> Duplicate
                      </button>
                      {dbViews.length > 1 && (
                        <button onClick={() => { deleteView(v.id); setShowViewMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
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
                    ? 'text-gray-600 bg-gray-100 opacity-100'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 opacity-0 group-hover/header:opacity-100'
                  }`}>
                <Plus className="w-3.5 h-3.5" />
              </button>
              {showAddView && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[200px] max-w-[240px]">
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

        {/* ─── Inline Filter/Sort panels ─── */}
        {showFilterPanel && (
          <div className="px-4 pb-2">
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-[520px]">
              <FilterPanel database={database} view={view} />
            </div>
          </div>
        )}
        {showSortPanel && (
          <div className="px-4 pb-2">
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-[420px]">
              <SortPanel database={database} view={view} />
            </div>
          </div>
        )}
      </div>

      {/* Settings panel (slides in from right) */}
      {showViewSettings && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowViewSettings(false)}>
          <div className="w-80 bg-white border-l border-gray-200 shadow-xl h-full overflow-auto" onClick={e => e.stopPropagation()}>
            <ViewSettingsPanel onClose={() => setShowViewSettings(false)} />
          </div>
        </div>
      )}
    </>
  );
}

/* --- FilterPanel --- */
function FilterPanel({ database, view }: { database: any; view: any }) {
  const { addFilter, updateFilter, removeFilter, clearFilters } = useDatabaseStore.getState();
  const allProps = Object.values(database.properties) as SchemaProperty[];
  const filters = view.filters || [];

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-700">Filters</span>
        {filters.length > 0 && (
          <button onClick={() => clearFilters(view.id)} className="text-xs text-red-500 hover:text-red-600">Clear all</button>
        )}
      </div>

      {filters.map((filter: any, idx: number) => {
        const prop = database.properties[filter.propertyId];
        const propType = prop?.type || 'text';
        const operators = getOperatorsForType(propType);

        return (
          <div key={filter.id} className="flex items-center gap-2 text-sm">
            {idx === 0 ? <span className="text-gray-400 text-xs w-10">Where</span>
              : <span className="text-gray-400 text-xs w-10">{view.filterConjunction === 'or' ? 'or' : 'and'}</span>}

            <select value={filter.propertyId}
              onChange={(e) => {
                const newProp = database.properties[e.target.value];
                const ops = getOperatorsForType(newProp?.type || 'text');
                updateFilter(view.id, filter.id, { propertyId: e.target.value, operator: ops[0].value, value: '' });
              }}
              className="px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm min-w-[100px]">
              {allProps.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select value={filter.operator}
              onChange={(e) => updateFilter(view.id, filter.id, { operator: e.target.value as FilterOperator })}
              className="px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm">
              {operators.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>

            {needsValue(filter.operator) && (
              <>
                {(prop?.type === 'select' || prop?.type === 'status') ? (
                  <select value={filter.value || ''}
                    onChange={(e) => updateFilter(view.id, filter.id, { value: e.target.value })}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm flex-1">
                    <option value="">Select...</option>
                    {prop.options?.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.value}</option>
                    ))}
                  </select>
                ) : prop?.type === 'multi_select' ? (
                  <select value={filter.value || ''}
                    onChange={(e) => updateFilter(view.id, filter.id, { value: e.target.value })}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm flex-1">
                    <option value="">Select...</option>
                    {prop.options?.map((opt: any) => (
                      <option key={opt.id} value={opt.id}>{opt.value}</option>
                    ))}
                  </select>
                ) : prop?.type === 'checkbox' ? null
                  : prop?.type === 'date' ? (
                    <input type="date" value={filter.value || ''}
                      onChange={(e) => updateFilter(view.id, filter.id, { value: e.target.value })}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm flex-1" />
                  ) : prop?.type === 'number' ? (
                    <input type="number" value={filter.value ?? ''}
                      onChange={(e) => updateFilter(view.id, filter.id, { value: e.target.value ? Number(e.target.value) : '' })}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm flex-1"
                      placeholder="Value" />
                  ) : (
                    <input type="text" value={filter.value || ''}
                      onChange={(e) => updateFilter(view.id, filter.id, { value: e.target.value })}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm flex-1"
                      placeholder="Value" />
                  )}
              </>
            )}

            <button onClick={() => removeFilter(view.id, filter.id)}
              className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-50 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      <button onClick={() => { const firstProp = allProps[0]; if (firstProp) addFilter(view.id, { propertyId: firstProp.id, operator: 'contains', value: '' }); }}
        className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 py-1 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add filter
      </button>
    </div>
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
        <span className="text-sm font-semibold text-gray-700">Sorts</span>
        {sorts.length > 0 && (
          <button onClick={() => clearSorts(view.id)} className="text-xs text-red-500 hover:text-red-600">Clear all</button>
        )}
      </div>

      {sorts.map((sort: any) => (
        <div key={sort.id} className="flex items-center gap-2 text-sm">
          <select value={sort.propertyId}
            onChange={(e) => updateSort(view.id, sort.id, { propertyId: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm flex-1">
            {allProps.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button onClick={() => updateSort(view.id, sort.id, { direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm transition-colors hover:bg-gray-50 ${sort.direction === 'asc' ? 'text-blue-600' : 'text-purple-600'}`}>
            {sort.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {sort.direction === 'asc' ? 'Ascending' : 'Descending'}
          </button>

          <button onClick={() => removeSort(view.id, sort.id)}
            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-50 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      <button onClick={() => { const firstProp = allProps[0]; if (firstProp) addSort(view.id, { propertyId: firstProp.id, direction: 'asc' }); }}
        className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 py-1 transition-colors">
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
        className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${show ? 'bg-gray-100' : ''}`}
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
            ? 'bg-gray-100 text-gray-600 opacity-100'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 opacity-0 group-hover/header:opacity-100'
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
      className={`absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
