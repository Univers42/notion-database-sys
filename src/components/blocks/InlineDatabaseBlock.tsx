// ═══════════════════════════════════════════════════════════════════════════════
// InlineDatabaseBlock — renders a real database + table view inline in a page
// ═══════════════════════════════════════════════════════════════════════════════
//
// When the user selects "Database - Inline" from the slash menu, a real
// DatabaseSchema + ViewConfig (table) are created in the store. This component
// renders the full TableView for that database, embedded directly in the page
// content — just like Notion's inline databases.
//
// The component also shows:
//   - A header with the database icon, editable name, and view tabs
//   - An "Add row" button to create new pages inline
//   - The full table with all column types, editing, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import type { SchemaProperty, Page } from '../../types/database';
import {
  Plus, MoreHorizontal, ChevronDown, Type, Hash, Calendar, List,
  CheckSquare, Tag, CircleDot, Users, Mail, Phone, Link, MapPin,
  Fingerprint, FileText, Mouse, Clock, User, Table, Columns, LayoutGrid,
  List as ListIcon, ArrowUpRight,
} from 'lucide-react';

// ─── Property icon helper ────────────────────────────────────────────────────

function PropIcon({ type, className = 'w-3.5 h-3.5' }: { type: string; className?: string }) {
  switch (type) {
    case 'title': case 'text': return <Type className={className} />;
    case 'number': return <Hash className={className} />;
    case 'select': return <List className={className} />;
    case 'multi_select': return <Tag className={className} />;
    case 'status': return <CircleDot className={className} />;
    case 'date': return <Calendar className={className} />;
    case 'checkbox': return <CheckSquare className={className} />;
    case 'person': case 'user': return <Users className={className} />;
    case 'email': return <Mail className={className} />;
    case 'phone': return <Phone className={className} />;
    case 'url': return <Link className={className} />;
    case 'place': return <MapPin className={className} />;
    case 'id': return <Fingerprint className={className} />;
    default: return <Type className={className} />;
  }
}

// ─── Read-only property types ─────────────────────────────────────────────────

const READ_ONLY_TYPES = new Set([
  'created_time', 'last_edited_time', 'created_by', 'last_edited_by', 'id',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function InlineDatabaseBlock({ block, pageId }: BlockRendererProps) {
  const databases = useDatabaseStore(s => s.databases);
  const allPages = useDatabaseStore(s => s.pages);
  const views = useDatabaseStore(s => s.views);
  const {
    addPage, updatePageProperty, deletePage, renameDatabase,
    openPage, addProperty, addSelectOption,
  } = useDatabaseStore.getState();

  const dbId = block.databaseId;
  const viewId = block.viewId;

  const database = dbId ? databases[dbId] : null;
  const view = viewId ? views[viewId] : null;

  const [editingCell, setEditingCell] = useState<{ pageId: string; propId: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  // Get pages for this database
  const pages = useMemo(() => {
    if (!dbId) return [];
    return Object.values(allPages).filter(p => p.databaseId === dbId);
  }, [allPages, dbId]);

  // Get visible properties
  const visibleProps = useMemo(() => {
    if (!database || !view) return [];
    const propOrder = view.visibleProperties || Object.keys(database.properties);
    return propOrder
      .map(id => database.properties[id])
      .filter((p): p is SchemaProperty => !!p);
  }, [database, view]);

  // ─── Handlers ────────────────────────────────────────────────

  const handleAddRow = useCallback(() => {
    if (!dbId) return;
    addPage(dbId);
  }, [dbId, addPage]);

  const handleCellClick = useCallback(
    (pgId: string, propId: string, propType: string) => {
      if (READ_ONLY_TYPES.has(propType)) return;
      setEditingCell({ pageId: pgId, propId });
    },
    []
  );

  const handleStopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleStartRename = useCallback(() => {
    if (database) {
      setNameInput(database.name);
      setEditingName(true);
    }
  }, [database]);

  const handleRename = useCallback(() => {
    if (dbId && nameInput.trim()) {
      renameDatabase(dbId, nameInput.trim());
    }
    setEditingName(false);
  }, [dbId, nameInput, renameDatabase]);

  const handleAddProperty = useCallback(() => {
    if (!dbId) return;
    addProperty(dbId, 'New Property', 'text');
  }, [dbId, addProperty]);

  // ─── No database linked ──────────────────────────────────────

  if (!database || !view) {
    return (
      <div className="my-2 border border-gray-200 rounded-lg p-6 text-center">
        <Table className="w-8 h-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">Database not found</p>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="my-3 border border-gray-200 rounded-lg overflow-hidden bg-white" ref={tableRef}>
      {/* Database header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
        <span className="text-base">{database.icon}</span>
        {editingName ? (
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
            className="text-sm font-semibold text-gray-800 outline-none bg-transparent border-b border-gray-300 px-0.5"
          />
        ) : (
          <button
            onClick={handleStartRename}
            className="text-sm font-semibold text-gray-800 hover:text-gray-600 transition-colors"
          >
            {database.name}
          </button>
        )}

        {/* View indicator */}
        <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
          <Table className="w-3.5 h-3.5" />
          <span>Table</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header */}
          <thead>
            <tr className="bg-gray-50/80">
              {visibleProps.map(prop => (
                <th
                  key={prop.id}
                  className="px-3 py-2 text-left font-medium text-gray-500 text-xs uppercase tracking-wider border-b border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                  style={{ minWidth: prop.type === 'title' ? 200 : 140 }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">
                      <PropIcon type={prop.type} className="w-3 h-3" />
                    </span>
                    {prop.name}
                  </div>
                </th>
              ))}
              {/* Add property column */}
              <th className="px-2 py-2 border-b border-gray-200 w-8">
                <button
                  onClick={handleAddProperty}
                  className="p-1 text-gray-300 hover:text-gray-500 rounded hover:bg-gray-100 transition-colors"
                  title="Add property"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {pages.map(page => (
              <tr key={page.id} className="group hover:bg-gray-50/50">
                {visibleProps.map(prop => {
                  const value = page.properties[prop.id];
                  const isEditing = editingCell?.pageId === page.id && editingCell?.propId === prop.id;

                  return (
                    <td
                      key={prop.id}
                      className="px-3 py-1.5 border-b border-r border-gray-200 last:border-r-0 overflow-hidden align-middle"
                      style={{ minWidth: prop.type === 'title' ? 200 : 140, maxWidth: 300 }}
                      onClick={() => handleCellClick(page.id, prop.id, prop.type)}
                    >
                      <InlineCell
                        prop={prop}
                        value={value}
                        page={page}
                        databaseId={dbId!}
                        isEditing={isEditing}
                        onUpdate={(v) => updatePageProperty(page.id, prop.id, v)}
                        onStopEditing={handleStopEditing}
                        onOpenPage={() => openPage(page.id)}
                      />
                    </td>
                  );
                })}
                <td className="border-b border-gray-200 px-1">
                  <button
                    className="p-1 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 rounded hover:bg-gray-100 transition-colors"
                    onClick={() => deletePage(page.id)}
                    title="Delete row"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <button
        onClick={handleAddRow}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
      >
        <Plus className="w-4 h-4" />
        <span>New</span>
      </button>

      {/* Meta footer */}
      <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400 flex items-center justify-between">
        <span>{pages.length} {pages.length === 1 ? 'row' : 'rows'}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE CELL — renders a single cell value with inline editing
// ═══════════════════════════════════════════════════════════════════════════════

interface InlineCellProps {
  prop: SchemaProperty;
  value: any;
  page: Page;
  databaseId: string;
  isEditing: boolean;
  onUpdate: (value: any) => void;
  onStopEditing: () => void;
  onOpenPage: () => void;
}

function InlineCell({ prop, value, page, databaseId, isEditing, onUpdate, onStopEditing, onOpenPage }: InlineCellProps) {
  const addSelectOption = useDatabaseStore(s => s.addSelectOption);

  switch (prop.type) {
    case 'title':
    case 'text':
      if (isEditing) {
        return (
          <input
            autoFocus
            type="text"
            value={value || ''}
            onChange={e => onUpdate(e.target.value)}
            onBlur={onStopEditing}
            onKeyDown={e => { if (e.key === 'Enter') onStopEditing(); }}
            className="w-full bg-transparent outline-none text-sm text-gray-900"
            placeholder="Empty"
          />
        );
      }
      return (
        <div className="flex items-center gap-1">
          <span className={`text-sm ${prop.type === 'title' ? 'font-medium' : ''} text-gray-900 truncate`}>
            {value || <span className="text-gray-400">Empty</span>}
          </span>
          {prop.type === 'title' && (
            <button
              className="shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-blue-500 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap"
              onClick={(e) => { e.stopPropagation(); onOpenPage(); }}
            >
              <ArrowUpRight className="w-3 h-3" /> OPEN
            </button>
          )}
        </div>
      );

    case 'number':
      if (isEditing) {
        return (
          <input
            autoFocus
            type="number"
            value={value ?? ''}
            onChange={e => onUpdate(e.target.value ? Number(e.target.value) : null)}
            onBlur={onStopEditing}
            onKeyDown={e => { if (e.key === 'Enter') onStopEditing(); }}
            className="w-full bg-transparent outline-none text-sm text-gray-900 tabular-nums"
            placeholder="Empty"
          />
        );
      }
      return (
        <div className="text-sm text-gray-900 tabular-nums truncate">
          {value != null && value !== '' ? Number(value).toLocaleString() : <span className="text-gray-400">Empty</span>}
        </div>
      );

    case 'select':
    case 'status': {
      const selOpt = prop.options?.find(o => o.id === value);
      if (isEditing) {
        return (
          <InlineSelectEditor
            prop={prop}
            value={value}
            databaseId={databaseId}
            onUpdate={onUpdate}
            onClose={onStopEditing}
          />
        );
      }
      return selOpt ? (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${selOpt.color}`}>{selOpt.value}</span>
      ) : <span className="text-gray-400 text-sm">Empty</span>;
    }

    case 'multi_select': {
      const msIds: string[] = Array.isArray(value) ? value : [];
      if (isEditing) {
        return (
          <InlineMultiSelectEditor
            prop={prop}
            value={value}
            databaseId={databaseId}
            onUpdate={onUpdate}
            onClose={onStopEditing}
          />
        );
      }
      return (
        <div className="flex gap-1 flex-nowrap overflow-hidden">
          {msIds.length > 0 ? msIds.map(id => {
            const opt = prop.options?.find(o => o.id === id);
            return opt ? <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${opt.color}`}>{opt.value}</span> : null;
          }) : <span className="text-gray-400 text-sm">Empty</span>}
        </div>
      );
    }

    case 'date':
      if (isEditing) {
        return (
          <input
            autoFocus
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={e => onUpdate(e.target.value ? new Date(e.target.value).toISOString() : null)}
            onBlur={onStopEditing}
            onKeyDown={e => { if (e.key === 'Enter') onStopEditing(); }}
            className="w-full bg-transparent outline-none text-sm text-gray-700"
          />
        );
      }
      return (
        <div className="text-sm text-gray-700 truncate">
          {value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-gray-400">Empty</span>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(!value); }}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
              value ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {value && <span className="text-white text-[10px]">✓</span>}
          </button>
        </div>
      );

    case 'person':
    case 'user':
      if (isEditing) {
        return (
          <input
            autoFocus
            type="text"
            value={value || ''}
            onChange={e => onUpdate(e.target.value)}
            onBlur={onStopEditing}
            onKeyDown={e => { if (e.key === 'Enter') onStopEditing(); }}
            className="w-full bg-transparent outline-none text-sm"
            placeholder="Name..."
          />
        );
      }
      return value ? (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            {String(value).charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-gray-900 truncate">{value}</span>
        </div>
      ) : <span className="text-gray-400 text-sm">Empty</span>;

    case 'email':
    case 'url':
    case 'phone':
      if (isEditing) {
        return (
          <input
            autoFocus
            type="text"
            value={value || ''}
            onChange={e => onUpdate(e.target.value)}
            onBlur={onStopEditing}
            onKeyDown={e => { if (e.key === 'Enter') onStopEditing(); }}
            className="w-full bg-transparent outline-none text-sm"
          />
        );
      }
      return value ? (
        <span className="text-sm text-blue-600 underline truncate block">{value}</span>
      ) : <span className="text-gray-400 text-sm">Empty</span>;

    case 'created_time':
    case 'last_edited_time': {
      const timeVal = prop.type === 'created_time' ? page.createdAt : page.updatedAt;
      return <div className="text-sm text-gray-500 truncate">{timeVal ? new Date(timeVal).toLocaleString() : '—'}</div>;
    }

    case 'id':
      return <div className="text-sm text-gray-500 font-mono tabular-nums truncate">{value || '—'}</div>;

    default:
      return <span className="text-sm text-gray-500 truncate">{String(value || '')}</span>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE SELECT EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

function InlineSelectEditor({ prop, value, databaseId, onUpdate, onClose }: {
  prop: SchemaProperty; value: any; databaseId: string; onUpdate: (v: any) => void; onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const addSelectOption = useDatabaseStore(s => s.addSelectOption);
  const options = prop.options || [];
  const filtered = options.filter(o => o.value.toLowerCase().includes(input.toLowerCase()));
  const exact = options.find(o => o.value.toLowerCase() === input.toLowerCase());

  return (
    <div className="absolute top-0 left-0 w-full min-w-[200px] bg-white shadow-xl border border-gray-200 rounded-lg z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="p-1.5 border-b border-gray-100">
        <input
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (exact) { onUpdate(exact.id); onClose(); }
              else if (input.trim()) {
                const colors = ['bg-red-100 text-red-800', 'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                const id = `opt-${Date.now()}`;
                addSelectOption(databaseId, prop.id, { id, value: input.trim(), color });
                onUpdate(id);
                onClose();
              }
            }
            if (e.key === 'Escape') onClose();
          }}
          className="w-full text-xs px-2 py-1 bg-gray-50 rounded outline-none"
          placeholder="Search or create..."
        />
      </div>
      <div className="max-h-40 overflow-y-auto p-1">
        {value && (
          <button onClick={() => { onUpdate(null); onClose(); }} className="w-full px-2 py-1 hover:bg-gray-50 text-xs text-gray-500 text-left rounded">
            Clear
          </button>
        )}
        {filtered.map(opt => (
          <button key={opt.id} onClick={() => { onUpdate(opt.id); onClose(); }}
            className="w-full px-2 py-1 hover:bg-gray-50 text-xs text-left rounded flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE MULTI-SELECT EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

function InlineMultiSelectEditor({ prop, value, databaseId, onUpdate, onClose }: {
  prop: SchemaProperty; value: any; databaseId: string; onUpdate: (v: any) => void; onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const addSelectOption = useDatabaseStore(s => s.addSelectOption);
  const options = prop.options || [];
  const selectedIds: string[] = Array.isArray(value) ? value : [];
  const unselected = options.filter(o => !selectedIds.includes(o.id));
  const filtered = unselected.filter(o => o.value.toLowerCase().includes(input.toLowerCase()));

  const toggle = (optId: string) => {
    const next = selectedIds.includes(optId) ? selectedIds.filter(id => id !== optId) : [...selectedIds, optId];
    onUpdate(next);
    setInput('');
  };

  return (
    <div className="absolute top-0 left-0 w-full min-w-[200px] bg-white shadow-xl border border-gray-200 rounded-lg z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="p-1.5 border-b border-gray-100">
        <div className="flex flex-wrap gap-0.5 mb-1">
          {selectedIds.map(id => {
            const opt = options.find(o => o.id === id);
            if (!opt) return null;
            return (
              <span key={id} className={`px-1 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5 ${opt.color}`}>
                {opt.value}
                <button onClick={() => toggle(id)} className="hover:opacity-60">&times;</button>
              </span>
            );
          })}
        </div>
        <input
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Backspace' && !input && selectedIds.length) onUpdate(selectedIds.slice(0, -1));
          }}
          className="w-full text-xs px-1 py-0.5 outline-none bg-transparent"
          placeholder={selectedIds.length ? '' : 'Search...'}
        />
      </div>
      <div className="max-h-36 overflow-y-auto p-1">
        {filtered.map(opt => (
          <button key={opt.id} onClick={() => toggle(opt.id)}
            className="w-full px-2 py-1 hover:bg-gray-50 text-xs text-left rounded flex items-center">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
