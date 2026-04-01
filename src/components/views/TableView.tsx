import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useActiveViewId } from '../../hooks/useDatabaseScope';
import { PropertyConfigPanel } from '../PropertyConfigPanel';
import { FormulaEditorPanel } from '../FormulaEditorPanel';
import { SchemaProperty } from '../../types/database';
import { CURSORS } from '../ui/cursors';
import { PropIcon, READ_ONLY_TYPES, ADD_PROPERTY_TYPES } from '../../constants/propertyIcons';
import { MemoTableRow } from './table/MemoTableRow';
import { useFillDrag } from './table/useFillDrag';
import { useColumnResize, useColWidth } from './table/useColumnResize';
import { useTableKeyboard } from './table/useTableKeyboard';
import {
  ChevronDown, ChevronRight, MoreHorizontal, EyeOff, Plus,
  GripVertical, Eye, Search, Trash2, Copy, ExternalLink,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';


// ═══════════════════════════════════════════════════════════════════════════════
// TABLE VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export function TableView() {
  // ── Reactive state (selective subscriptions — only re-render when these change) ──
  const activeViewId = useActiveViewId();
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const _pages = useDatabaseStore(s => s.pages); // subscribe to page changes
  const _searchQuery = useDatabaseStore(s => s.searchQuery); // subscribe to search changes

  // ── Stable action references (never cause re-renders) ──
  const { updatePageProperty, getPagesForView, addPage, addProperty,
    togglePropertyVisibility, hideAllProperties, openPage, deletePage,
    getGroupedPages, duplicatePage } = useDatabaseStore.getState();

  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const [focusedCell, setFocusedCell] = useState<{ pageId: string; propId: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ pageId: string; propId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [configPanel, setConfigPanel] = useState<{ prop: SchemaProperty; position: { top: number; left: number } } | null>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [formulaEditor, setFormulaEditor] = useState<{ propId: string } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Extracted hooks ──
  const { fillDrag, startFillDrag } = useFillDrag(activeViewId);
  const { resizingCol, handleResizeStart } = useColumnResize(view?.id ?? '');
  const getColWidth = useColWidth();

  // Reset visible count when the view or load limit changes
  useEffect(() => { setVisibleCount(null); }, [activeViewId, view?.settings?.loadLimit]);

  // ── Memoized derived data (must be before early return for hooks rules) ──
  const visibleProps = useMemo(
    () => (view && database) ? view.visibleProperties.map(id => database.properties[id]).filter(Boolean) : [],
    [view?.visibleProperties, database?.properties]
  );
  const allProps = useMemo(
    () => database ? Object.values(database.properties) : [],
    [database?.properties]
  );
  const hiddenProps = useMemo(
    () => allProps.filter(p => view ? !view.visibleProperties.includes(p.id) : true),
    [allProps, view?.visibleProperties]
  );
  const filteredVisible = useMemo(
    () => visibleProps.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [visibleProps, searchQuery]
  );
  const filteredHidden = useMemo(
    () => hiddenProps.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [hiddenProps, searchQuery]
  );

  if (!view || !database) return null;

  const pages = getPagesForView(view.id);
  const settings = view.settings || {};
  const showVerticalLines = settings.showVerticalLines !== false;
  const wrapContent = settings.wrapContent === true;
  const showRowNumbers = settings.showRowNumbers === true;
  const loadLimit = settings.loadLimit || 50;

  const currentLimit = visibleCount ?? loadLimit;
  const displayedPages = pages.slice(0, currentLimit);
  const hasMore = pages.length > currentLimit;

  // ─── KEYBOARD NAVIGATION (extracted hook) ──────────────────
  const handleKeyDown = useTableKeyboard({
    focusedCell, editingCell, setFocusedCell, setEditingCell,
    displayedPages, visibleProps, database, tableRef,
  });

  // ─── ROW CONTEXT MENU (single shared instance) ──────────────
  const [rowMenu, setRowMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);

  // ─── STABLE CALLBACKS for MemoTableRow ─────────────────────
  const handleCellClick = useCallback((pageId: string, propId: string, type: string, currentValue: any) => {
    setFocusedCell({ pageId, propId });
    if (type === 'checkbox') {
      useDatabaseStore.getState().updatePageProperty(pageId, propId, !currentValue);
    } else if (!READ_ONLY_TYPES.has(type)) {
      setEditingCell({ pageId, propId });
    }
  }, []);

  const handleUpdateProperty = useCallback((pageId: string, propId: string, value: any) => {
    useDatabaseStore.getState().updatePageProperty(pageId, propId, value);
  }, []);

  const handleStopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleOpenPage = useCallback((pageId: string) => {
    useDatabaseStore.getState().openPage(pageId);
  }, []);

  const handleFormulaEdit = useCallback((propId: string) => {
    setFormulaEditor({ propId });
  }, []);

  const handleRowMenu = useCallback((pageId: string, x: number, y: number) => {
    setRowMenu({ pageId, x, y });
  }, []);

  const handlePropertyConfig = useCallback((prop: SchemaProperty, position: { top: number; left: number }) => {
    setConfigPanel({ prop, position });
  }, []);

  // ─── HEADER CLICK → Property Config Panel ─────────────────
  const handleHeaderClick = (e: React.MouseEvent, prop: SchemaProperty) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setConfigPanel({ prop, position: { top: rect.bottom + 4, left: rect.left } });
  };

  // ─── GROUP HEADER ROW COMPONENT ─────────────────────────
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  const colCount = visibleProps.length + (showRowNumbers ? 1 : 0) + 2;

  // ─── GROUPED vs FLAT rendering ─────────────────────────
  const isGrouped = !!view.grouping;
  const groupedData = isGrouped ? getGroupedPages(view.id) : [];

  // Render a set of table rows for given pages (shared between grouped and flat)
  const renderPageRows = (rowPages: typeof displayedPages, globalOffset = 0) =>
    rowPages.map((page, i) => {
      const rowIdx = globalOffset + i;
      const isFocusedRow = focusedCell?.pageId === page.id;
      const isEditingRow = editingCell?.pageId === page.id;
      return (
        <MemoTableRow
          key={page.id}
          page={page}
          rowIdx={rowIdx}
          visibleProps={visibleProps}
          focusedPropId={isFocusedRow ? focusedCell!.propId : null}
          editingPropId={isEditingRow ? editingCell!.propId : null}
          fillDrag={fillDrag}
          showRowNumbers={showRowNumbers}
          showVerticalLines={showVerticalLines}
          wrapContent={wrapContent}
          getColWidth={getColWidth}
          databaseId={database.id}
          onCellClick={handleCellClick}
          onUpdateProperty={handleUpdateProperty}
          onStopEditing={handleStopEditing}
          onOpenPage={handleOpenPage}
          onFillDragStart={startFillDrag}
          onFormulaEdit={handleFormulaEdit}
          onRowMenu={handleRowMenu}
          onPropertyConfig={handlePropertyConfig}
          tableRef={tableRef}
        />
      );
    });

  return (
    <div className="flex-1 overflow-auto bg-surface-primary outline-none" tabIndex={0} onKeyDown={handleKeyDown} ref={tableRef}>
      <div className="inline-block min-w-full">
        <table className="min-w-full text-left border-collapse">
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
                      const newOrder = [...view.visibleProperties];
                      const fromIdx = newOrder.indexOf(dragColId);
                      const toIdx = newOrder.indexOf(prop.id);
                      newOrder.splice(fromIdx, 1);
                      newOrder.splice(toIdx, 0, dragColId);
                      useDatabaseStore.getState().reorderProperties(view.id, newOrder);
                    }
                    setDragColId(null);
                  }}>
                  <button
                    onClick={(e) => handleHeaderClick(e, prop)}
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
                        <DropdownMenu.Item key={type} onSelect={() => addProperty(database.id, `New ${label}`, type as any)}
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
                              <button onClick={() => hideAllProperties(view.id)} className="hover:text-hover-text-strong">Hide all</button>
                            </div>
                            {filteredVisible.map(p => (
                              <div key={p.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-hover-surface rounded group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <GripVertical className="w-3.5 h-3.5 text-ink-disabled opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                                  <PropIcon type={p.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                                  <span className="truncate text-ink-body">{p.name}</span>
                                </div>
                                <button onClick={() => togglePropertyVisibility(view.id, p.id)} className="shrink-0 ml-2">
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
                                <button onClick={() => togglePropertyVisibility(view.id, p.id)} className="shrink-0 ml-2">
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
          <tbody>
            {/* ═══ GROUPED RENDERING ═══ */}
            {isGrouped ? (
              <>
                {groupedData.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.groupId);
                  const colorParts = group.groupColor.split(' ');
                  const bgColor = colorParts[0] || 'bg-surface-muted';
                  const textColor = colorParts[1] || 'text-ink-body';

                  return (
                    <React.Fragment key={group.groupId}>
                      {/* ── Group header row ── */}
                      <tr className="group/hdr">
                        <td colSpan={colCount} className="p-0 border-b border-line bg-surface-secondary-soft2">
                          <div className="flex items-center gap-2 px-3 py-2 select-none">
                            {/* Toggle arrow */}
                            <button
                              onClick={() => toggleGroup(group.groupId)}
                              className="p-0.5 hover:bg-hover-surface3 rounded transition-colors shrink-0"
                            >
                              <ChevronRight className={`w-3.5 h-3.5 text-ink-secondary transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`} />
                            </button>

                            {/* Group label badge */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${bgColor} ${textColor}`}>
                              {group.groupLabel}
                            </span>

                            {/* Count */}
                            <span className="text-xs text-ink-muted tabular-nums">{group.pages.length}</span>

                            {/* Hover actions */}
                            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/hdr:opacity-100 transition-opacity">
                              <button
                                onClick={() => addPage(database.id)}
                                className="p-1 hover:bg-hover-surface3 rounded text-ink-muted hover:text-hover-text transition-colors"
                                title="Add page to group"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1 hover:bg-hover-surface3 rounded text-ink-muted hover:text-hover-text transition-colors"
                                title="Group options"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* ── Group content rows ── */}
                      {!isCollapsed && renderPageRows(group.pages)}

                      {/* Empty group placeholder */}
                      {!isCollapsed && group.pages.length === 0 && (
                        <tr>
                          <td colSpan={colCount} className="px-8 py-3 text-sm text-ink-muted border-b border-line bg-surface-secondary-soft5">
                            No pages
                          </td>
                        </tr>
                      )}

                      {/* + New in group */}
                      {!isCollapsed && (
                        <tr>
                          <td colSpan={colCount} className="p-0 border-b border-line-light">
                            <button onClick={() => addPage(database.id)}
                              className="w-full text-left px-8 py-1.5 text-xs text-ink-muted hover:text-hover-text hover:bg-hover-surface-accent3 transition-colors flex items-center gap-1.5">
                              <Plus className="w-3 h-3" /> New
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Global footer */}
                <tr>
                  <td colSpan={colCount} className="p-0">
                    <button onClick={() => addPage(database.id)}
                      className="w-full text-left px-4 py-2.5 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface-accent transition-colors flex items-center gap-2 border-b border-transparent hover:border-hover-border-accent">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  </td>
                </tr>
              </>
            ) : (
              /* ═══ FLAT (ungrouped) RENDERING ═══ */
              <>
                {renderPageRows(displayedPages)}

                {hasMore && (
                  <tr>
                    <td colSpan={colCount} className="p-0 border-b border-line">
                      <button
                        onClick={() => setVisibleCount(Math.min(currentLimit + loadLimit, pages.length))}
                        className="w-full text-left px-4 py-2 text-sm text-accent-text-soft hover:text-hover-accent-text-bold hover:bg-hover-surface-accent2 transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <ChevronDown className="w-4 h-4" />
                          Load more
                        </span>
                        <span className="text-xs text-ink-muted tabular-nums">
                          {currentLimit} of {pages.length}
                        </span>
                      </button>
                    </td>
                  </tr>
                )}

                <tr>
                  <td colSpan={colCount} className="p-0">
                    <button onClick={() => addPage(database.id)}
                      className="w-full text-left px-4 py-2.5 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface-accent transition-colors flex items-center gap-2 border-b border-transparent hover:border-hover-border-accent">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {configPanel && (
        <PropertyConfigPanel
          property={configPanel.prop}
          databaseId={database.id}
          viewId={view.id}
          position={configPanel.position}
          onClose={() => setConfigPanel(null)}
        />
      )}

      {formulaEditor && (
        <FormulaEditorPanel
          databaseId={database.id}
          propertyId={formulaEditor.propId}
          onClose={() => setFormulaEditor(null)}
        />
      )}

      {/* ── Single shared row context menu ── */}
      {rowMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)} />
          <div
            className="fixed z-50 min-w-[160px] bg-surface-primary rounded-lg p-1 shadow-xl border border-line text-sm"
            style={{ left: rowMenu.x, top: rowMenu.y }}
          >
            <button onClick={() => { openPage(rowMenu.pageId); setRowMenu(null); }}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-hover-surface rounded cursor-pointer w-full text-left">
              <ExternalLink className="w-4 h-4 text-ink-muted" /> Open page
            </button>
            <button onClick={() => { duplicatePage(rowMenu.pageId); setRowMenu(null); }}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-hover-surface rounded cursor-pointer w-full text-left">
              <Copy className="w-4 h-4 text-ink-muted" /> Duplicate
            </button>
            <div className="h-px bg-surface-tertiary my-1" />
            <button onClick={() => { deletePage(rowMenu.pageId); setRowMenu(null); }}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-hover-danger rounded cursor-pointer w-full text-left text-danger-text">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
