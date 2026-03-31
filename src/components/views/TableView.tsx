import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { PropertyConfigPanel } from '../PropertyConfigPanel';
import { FormulaEditorPanel } from '../FormulaEditorPanel';
import { RelationCellEditor, StatusCellEditor } from '../CellEditors';
import { SchemaProperty, Page } from '../../types/database';
import { CURSORS } from '../ui/cursors';
import {
  CheckSquare, Type, Hash, Calendar, List, CheckCircle2, ChevronDown, ChevronRight,
  MoreHorizontal, EyeOff, Plus, GripVertical, Eye, Search, ArrowUpRight,
  Mail, Phone, Link, User, Clock, Trash2, Copy, ExternalLink, Tag, CircleDot,
  MapPin, Fingerprint, FileText, MousePointerClick, Users, Sigma, UserCheck,
  AlertTriangle, Database, GitBranch
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';

// ─── SELECT EDITOR ───────────────────────────────────────────────────────────

function SelectEditor({ property, value, onUpdate, onClose, databaseId }: {
  property: SchemaProperty; value: any; onUpdate: (v: any) => void; onClose: () => void; databaseId: string;
}) {
  const [input, setInput] = useState('');
  const measureRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const addSelectOption = useDatabaseStore(s => s.addSelectOption);
  const options = property.options || [];
  const filtered = options.filter(o => o.value.toLowerCase().includes(input.toLowerCase()));
  const exact = options.find(o => o.value.toLowerCase() === input.toLowerCase());

  useEffect(() => {
    if (measureRef.current) {
      const td = measureRef.current.closest('td');
      if (td) setRect(td.getBoundingClientRect());
    }
  }, []);

  const handleSelect = (optId: string) => { onUpdate(optId); onClose(); };

  const handleCreate = () => {
    if (!input.trim() || exact) return;
    const colors = ['bg-red-100 text-red-800', 'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800', 'bg-pink-100 text-pink-800', 'bg-cyan-100 text-cyan-800', 'bg-orange-100 text-orange-800'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const id = `opt-${Date.now()}`;
    addSelectOption(databaseId, property.id, { id, value: input.trim(), color });
    onUpdate(id);
    onClose();
  };

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
          <div
            className="fixed min-w-[220px] bg-white shadow-xl border border-gray-200 rounded-lg z-[9999] overflow-hidden"
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 220) }}
            onClick={e => e.stopPropagation()}>
            <div className="p-2 border-b border-gray-100">
              <input autoFocus value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { exact ? handleSelect(exact.id) : input.trim() && handleCreate(); }
                  if (e.key === 'Escape') onClose();
                }}
                className="w-full text-sm px-2 py-1.5 bg-gray-50 rounded outline-none focus:ring-1 ring-blue-400" placeholder="Search or create..." />
            </div>
            <div className="max-h-52 overflow-y-auto p-1">
              {value && (
                <button onClick={() => { onUpdate(null); onClose(); }} className="w-full px-2 py-1.5 hover:bg-gray-50 text-sm text-gray-500 text-left rounded">
                  Clear selection
                </button>
              )}
              {filtered.map(opt => (
                <button key={opt.id} onClick={() => handleSelect(opt.id)}
                  className="w-full px-2 py-1.5 hover:bg-gray-50 text-sm text-left rounded flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span>
                  {opt.id === value && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 ml-auto" />}
                </button>
              ))}
              {input.trim() && !exact && (
                <button onClick={handleCreate}
                  className="w-full px-2 py-1.5 hover:bg-gray-50 text-sm text-left rounded flex items-center gap-2 text-gray-600">
                  <Plus className="w-3.5 h-3.5" /> Create <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100">"{input}"</span>
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ─── MULTI-SELECT EDITOR ─────────────────────────────────────────────────────

function MultiSelectEditor({ property, value, onUpdate, onClose, databaseId }: {
  property: SchemaProperty; value: any; onUpdate: (v: any) => void; onClose: () => void; databaseId: string;
}) {
  const [input, setInput] = useState('');
  const measureRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const addSelectOption = useDatabaseStore(s => s.addSelectOption);
  const options = property.options || [];
  const selectedIds: string[] = Array.isArray(value) ? value : [];
  const unselected = options.filter(o => !selectedIds.includes(o.id));
  const filtered = unselected.filter(o => o.value.toLowerCase().includes(input.toLowerCase()));
  const exact = options.find(o => o.value.toLowerCase() === input.toLowerCase());

  useEffect(() => {
    if (measureRef.current) {
      const td = measureRef.current.closest('td');
      if (td) setRect(td.getBoundingClientRect());
    }
  }, []);

  const toggle = (optId: string) => {
    const next = selectedIds.includes(optId) ? selectedIds.filter(id => id !== optId) : [...selectedIds, optId];
    onUpdate(next);
    setInput('');
  };

  const handleCreate = () => {
    if (!input.trim() || exact) return;
    const colors = ['bg-red-100 text-red-800', 'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const id = `opt-${Date.now()}`;
    addSelectOption(databaseId, property.id, { id, value: input.trim(), color });
    onUpdate([...selectedIds, id]);
    setInput('');
  };

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
          <div
            className="fixed min-w-[220px] bg-white shadow-xl border border-gray-200 rounded-lg z-[9999] overflow-hidden"
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 220) }}
            onClick={e => e.stopPropagation()}>
            <div className="p-2 border-b border-gray-100">
              <div className="flex flex-wrap gap-1 mb-1">
                {selectedIds.map(id => {
                  const opt = options.find(o => o.id === id);
                  if (!opt) return null;
                  return (
                    <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${opt.color}`}>
                      {opt.value}
                      <button onClick={() => toggle(id)} className="hover:opacity-60">&times;</button>
                    </span>
                  );
                })}
              </div>
              <input autoFocus value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { exact ? toggle(exact.id) : input.trim() && handleCreate(); }
                  if (e.key === 'Escape') onClose();
                  if (e.key === 'Backspace' && !input && selectedIds.length) onUpdate(selectedIds.slice(0, -1));
                }}
                className="w-full text-sm px-1 py-1 outline-none bg-transparent" placeholder={selectedIds.length ? '' : 'Search or create...'} />
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.map(opt => (
                <button key={opt.id} onClick={() => toggle(opt.id)}
                  className="w-full px-2 py-1.5 hover:bg-gray-50 text-sm text-left rounded flex items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span>
                </button>
              ))}
              {input.trim() && !exact && (
                <button onClick={handleCreate}
                  className="w-full px-2 py-1.5 hover:bg-gray-50 text-sm text-left rounded flex items-center gap-2 text-gray-600">
                  <Plus className="w-3.5 h-3.5" /> Create "{input}"
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ─── PROPERTY ICON ───────────────────────────────────────────────────────────

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
    case 'files_media': return <FileText className={className} />;
    case 'place': return <MapPin className={className} />;
    case 'id': return <Fingerprint className={className} />;
    case 'button': return <MousePointerClick className={className} />;
    case 'created_time': case 'last_edited_time': return <Clock className={className} />;
    case 'created_by': case 'last_edited_by': return <User className={className} />;
    case 'formula': return <Sigma className={className} />;
    case 'rollup': return <GitBranch className={className} />;
    case 'relation': return <ExternalLink className={className} />;
    case 'assigned_to': return <UserCheck className={className} />;
    case 'due_date': return <AlertTriangle className={className} />;
    case 'custom': return <Database className={className} />;
    default: return <Type className={className} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// READ-ONLY TYPES (no editing allowed)
// ═══════════════════════════════════════════════════════════════════════════════
const READ_ONLY_TYPES = new Set(['created_time', 'last_edited_time', 'created_by', 'last_edited_by', 'id', 'rollup', 'button']);

// ═══════════════════════════════════════════════════════════════════════════════
// MEMOIZED TABLE ROW — only re-renders when its own data changes
// ═══════════════════════════════════════════════════════════════════════════════

interface MemoTableRowProps {
  page: Page;
  rowIdx: number;
  visibleProps: SchemaProperty[];
  focusedPropId: string | null;   // which col in THIS row is focused (null if not)
  editingPropId: string | null;   // which col in THIS row is editing (null if not)
  fillDrag: { sourcePropId: string; sourceRowIdx: number; currentRowIdx: number } | null;
  showRowNumbers: boolean;
  showVerticalLines: boolean;
  wrapContent: boolean;
  getColWidth: (propId: string) => number;
  databaseId: string;
  onCellClick: (pageId: string, propId: string, type: string, currentValue: any) => void;
  onUpdateProperty: (pageId: string, propId: string, value: any) => void;
  onStopEditing: () => void;
  onOpenPage: (pageId: string) => void;
  onFillDragStart: (propId: string, rowIdx: number) => void;
  onFormulaEdit: (propId: string) => void;
  onRowMenu: (pageId: string, x: number, y: number) => void;
  onPropertyConfig: (prop: SchemaProperty, position: { top: number; left: number }) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
}

const MemoTableRow = React.memo(function MemoTableRow({
  page, rowIdx, visibleProps, focusedPropId, editingPropId,
  fillDrag, showRowNumbers, showVerticalLines, wrapContent,
  getColWidth, databaseId, onCellClick, onUpdateProperty, onStopEditing,
  onOpenPage, onFillDragStart, onFormulaEdit, onRowMenu, onPropertyConfig, tableRef,
}: MemoTableRowProps) {

  const cellBorder = showVerticalLines ? 'border-r border-gray-200' : '';
  const resolveFormula = useDatabaseStore.getState().resolveFormula;
  const resolveRollup = useDatabaseStore.getState().resolveRollup;

  return (
    <tr data-row-idx={rowIdx} className="group hover:bg-gray-50/50">
      {showRowNumbers && (
        <td className="w-10 px-2 py-1.5 border-r border-b border-gray-200 text-xs text-gray-400 text-center tabular-nums">
          {rowIdx + 1}
        </td>
      )}
      {visibleProps.map(prop => {
        const value = page.properties[prop.id];
        const isFocused = focusedPropId === prop.id;
        const isEditing = editingPropId === prop.id;

        // Fill range check — O(1)
        const inFillRange = fillDrag && prop.id === fillDrag.sourcePropId && (() => {
          const minR = Math.min(fillDrag.sourceRowIdx, fillDrag.currentRowIdx);
          const maxR = Math.max(fillDrag.sourceRowIdx, fillDrag.currentRowIdx);
          return rowIdx >= minR && rowIdx <= maxR && rowIdx !== fillDrag.sourceRowIdx;
        })();

        const focusRing = isFocused
          ? 'ring-2 ring-emerald-500/80 ring-inset bg-emerald-50/30 z-10 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.5)]'
          : inFillRange
            ? 'ring-1 ring-emerald-400/50 ring-inset bg-emerald-50/40 z-[5]'
            : '';

        const handleClick = () => onCellClick(page.id, prop.id, prop.type, value);

        // ─── Cell content rendering ───
        let content: React.ReactNode;

        switch (prop.type) {
          case 'title':
          case 'text':
            content = isEditing ? (
              <input autoFocus type="text" value={value || ''} onChange={e => onUpdateProperty(page.id, prop.id, e.target.value)}
                onBlur={() => onStopEditing()}
                onKeyDown={e => { if (e.key === 'Enter') { onStopEditing(); tableRef.current?.focus(); } }}
                className="w-full bg-transparent outline-none text-sm text-gray-900" placeholder="Empty" />
            ) : (
              <div className="flex items-center gap-1">
                <div className={`text-sm text-gray-900 min-h-[20px] flex-1 min-w-0 ${prop.type === 'title' ? 'font-medium' : ''} ${wrapContent ? 'whitespace-pre-wrap break-words' : 'truncate max-w-full'}`}>
                  {value || <span className="text-gray-400">Empty</span>}
                </div>
                {prop.type === 'title' && (
                  <button
                    className="shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-blue-500 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap"
                    onClick={(e) => { e.stopPropagation(); onOpenPage(page.id); }}>
                    <ArrowUpRight className="w-3 h-3" /> OPEN
                  </button>
                )}
              </div>
            );
            break;

          case 'number':
            content = isEditing ? (
              <input autoFocus type="number" value={value ?? ''} onChange={e => onUpdateProperty(page.id, prop.id, e.target.value ? Number(e.target.value) : null)}
                onBlur={() => onStopEditing()}
                onKeyDown={e => { if (e.key === 'Enter') { onStopEditing(); tableRef.current?.focus(); } }}
                className="w-full bg-transparent outline-none text-sm text-gray-900 tabular-nums" placeholder="Empty" />
            ) : (
              <div className="text-sm text-gray-900 tabular-nums truncate">
                {value != null && value !== '' ? Number(value).toLocaleString() : <span className="text-gray-400">Empty</span>}
              </div>
            );
            break;

          case 'select': {
            const selOpt = prop.options?.find(o => o.id === value);
            content = isEditing ? (
              <SelectEditor property={prop} value={value} databaseId={databaseId}
                onUpdate={v => onUpdateProperty(page.id, prop.id, v)}
                onClose={() => { onStopEditing(); tableRef.current?.focus(); }} />
            ) : (
              selOpt ? (
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${selOpt.color}`}>{selOpt.value}</span>
                </div>
              ) : <span className="text-gray-400 text-sm">Empty</span>
            );
            break;
          }

          case 'status': {
            const statusOpt = prop.options?.find(o => o.id === value);
            content = isEditing ? (
              <StatusCellEditor
                property={prop}
                value={value}
                databaseId={databaseId}
                onUpdate={v => onUpdateProperty(page.id, prop.id, v)}
                onClose={() => { onStopEditing(); tableRef.current?.focus(); }}
                onEditProperty={() => {
                  onStopEditing();
                  onPropertyConfig(prop, { top: 200, left: 200 });
                }}
              />
            ) : (
              statusOpt ? (
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusOpt.color.split(' ')[0]}`} />
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusOpt.color}`}>{statusOpt.value}</span>
                </div>
              ) : <span className="text-gray-400 text-sm">Empty</span>
            );
            break;
          }

          case 'multi_select': {
            const msIds: string[] = Array.isArray(value) ? value : [];
            content = isEditing ? (
              <MultiSelectEditor property={prop} value={value} databaseId={databaseId}
                onUpdate={v => onUpdateProperty(page.id, prop.id, v)}
                onClose={() => { onStopEditing(); tableRef.current?.focus(); }} />
            ) : (
              <div className={`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
                {msIds.length > 0 ? msIds.map(id => {
                  const opt = prop.options?.find(o => o.id === id);
                  return opt ? <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${opt.color}`}>{opt.value}</span> : null;
                }) : <span className="text-gray-400 text-sm">Empty</span>}
              </div>
            );
            break;
          }

          case 'date':
            content = isEditing ? (
              <input autoFocus type="date" value={value ? new Date(value).toISOString().split('T')[0] : ''}
                onChange={e => onUpdateProperty(page.id, prop.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                onBlur={() => onStopEditing()}
                onKeyDown={e => { if (e.key === 'Enter') { onStopEditing(); tableRef.current?.focus(); } }}
                className="w-full bg-transparent outline-none text-sm text-gray-700" />
            ) : (
              <div className="text-sm text-gray-700 truncate whitespace-nowrap">{value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-gray-400">Empty</span>}</div>
            );
            break;

          case 'checkbox':
            content = (
              <div className="flex items-center justify-center">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer ${value ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'}`}>
                  {value && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
              </div>
            );
            break;

          case 'person':
          case 'user':
            content = isEditing ? (
              <input autoFocus type="text" value={value || ''} onChange={e => onUpdateProperty(page.id, prop.id, e.target.value)}
                onBlur={() => onStopEditing()}
                onKeyDown={e => { if (e.key === 'Enter') { onStopEditing(); tableRef.current?.focus(); } }}
                className="w-full bg-transparent outline-none text-sm" placeholder="Name..." />
            ) : (
              value ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {String(value).charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-sm text-gray-900 ${wrapContent ? 'break-words' : 'truncate'}`}>{value}</span>
                </div>
              ) : <span className="text-gray-400 text-sm">Empty</span>
            );
            break;

          case 'email': case 'url': case 'phone':
            content = isEditing ? (
              <input autoFocus type="text" value={value || ''} onChange={e => onUpdateProperty(page.id, prop.id, e.target.value)}
                onBlur={() => onStopEditing()}
                onKeyDown={e => { if (e.key === 'Enter') { onStopEditing(); tableRef.current?.focus(); } }}
                className="w-full bg-transparent outline-none text-sm" />
            ) : (
              value ? <span className={`text-sm text-blue-600 underline block ${wrapContent ? 'break-all' : 'truncate'}`}>{value}</span>
                    : <span className="text-gray-400 text-sm">Empty</span>
            );
            break;

          case 'place': {
            const placeVal = typeof value === 'object' && value ? value : null;
            content = isEditing ? (
              <input autoFocus type="text"
                value={placeVal?.address || (typeof value === 'string' ? value : '')}
                onChange={e => onUpdateProperty(page.id, prop.id, { address: e.target.value })}
                onBlur={() => onStopEditing()}
                onKeyDown={e => { if (e.key === 'Enter') { onStopEditing(); tableRef.current?.focus(); } }}
                className="w-full bg-transparent outline-none text-sm" placeholder="Address..." />
            ) : (
              placeVal?.address ? (
                <div className={`flex items-center gap-1.5 text-sm text-gray-700 ${wrapContent ? '' : 'overflow-hidden'}`}>
                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className={wrapContent ? 'break-words' : 'truncate'}>{placeVal.address}</span>
                </div>
              ) : <span className="text-gray-400 text-sm">Empty</span>
            );
            break;
          }

          case 'id':
            content = (
              <div className="text-sm text-gray-500 font-mono tabular-nums truncate">
                {value || <span className="text-gray-300">—</span>}
              </div>
            );
            break;

          case 'files_media':
            content = (
              <div className="text-sm text-gray-400 italic truncate">
                {Array.isArray(value) && value.length > 0 ? `${value.length} file(s)` : 'No files'}
              </div>
            );
            break;

          case 'button':
            content = (
              <button className="px-2.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 rounded-md" onClick={e => {
                e.stopPropagation();
                if (prop.buttonConfig?.action === 'open_url' && prop.buttonConfig?.url) {
                  window.open(prop.buttonConfig.url, '_blank');
                } else if (prop.buttonConfig?.action === 'copy') {
                  navigator.clipboard?.writeText(prop.buttonConfig?.url || '');
                }
              }}>
                {prop.buttonConfig?.label || 'Click'}
              </button>
            );
            break;

          case 'formula': {
            const formulaResult = prop.formulaConfig
              ? resolveFormula(databaseId, page, prop.formulaConfig.expression)
              : '#N/A';
            content = (
              <div
                className="text-sm text-gray-700 tabular-nums truncate font-mono cursor-pointer group/formula"
                onClick={e => { e.stopPropagation(); onFormulaEdit(prop.id); }}
                title="Click to edit formula"
              >
                <div className="flex items-center gap-1.5">
                  <span className="truncate">
                    {formulaResult != null && formulaResult !== '' && formulaResult !== '#ERROR'
                      ? (typeof formulaResult === 'number' ? formulaResult.toLocaleString() : String(formulaResult))
                      : <span className="text-red-400">{formulaResult === '#ERROR' ? '#ERROR' : 'Empty'}</span>}
                  </span>
                  <Sigma className="w-3 h-3 text-gray-300 opacity-0 group-hover/formula:opacity-100 shrink-0" />
                </div>
              </div>
            );
            break;
          }

          case 'rollup': {
            const rollupResult = resolveRollup(databaseId, page, prop.id);
            const displayAs = prop.rollupConfig?.displayAs || 'number';
            if (rollupResult == null) {
              content = <span className="text-gray-400 text-sm">—</span>;
            } else if (Array.isArray(rollupResult)) {
              content = (
                <div className={`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
                  {rollupResult.map((v, i) => (
                    <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-xs text-gray-600 font-medium shrink-0 max-w-[120px] truncate">
                      {v === true ? '✓' : v === false ? '✗' : String(v ?? '—')}
                    </span>
                  ))}
                  {rollupResult.length === 0 && <span className="text-gray-400 text-sm">Empty</span>}
                </div>
              );
            } else if (displayAs === 'bar' && typeof rollupResult === 'number') {
              const pct = Math.min(100, Math.max(0, (rollupResult / 15) * 100));
              content = (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 tabular-nums shrink-0">{rollupResult}</span>
                </div>
              );
            } else if (displayAs === 'ring' && typeof rollupResult === 'number') {
              const pct = Math.min(100, Math.max(0, rollupResult));
              const r = 8; const circ = 2 * Math.PI * r;
              const offset = circ - (pct / 100) * circ;
              content = (
                <div className="flex items-center gap-2">
                  <svg width="22" height="22" className="shrink-0 -rotate-90">
                    <circle cx="11" cy="11" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="11" cy="11" r={r} fill="none"
                      stroke={pct >= 80 ? '#22c55e' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={offset} />
                  </svg>
                  <span className="text-xs text-gray-600 tabular-nums">{pct}%</span>
                </div>
              );
            } else {
              content = (
                <div className="text-sm text-gray-700 tabular-nums truncate font-mono">
                  {typeof rollupResult === 'number' ? rollupResult.toLocaleString() : String(rollupResult)}
                </div>
              );
            }
            break;
          }

          case 'relation': {
            const relatedIds: string[] = Array.isArray(value) ? value : [];
            const storePages = useDatabaseStore.getState().pages;
            content = isEditing ? (
              <RelationCellEditor
                property={prop}
                value={value}
                pageId={page.id}
                databaseId={databaseId}
                onUpdate={v => onUpdateProperty(page.id, prop.id, v)}
                onClose={() => { onStopEditing(); tableRef.current?.focus(); }}
              />
            ) : relatedIds.length > 0 ? (
              <div className={`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
                {relatedIds.map(rid => {
                  const relPage = storePages[rid];
                  if (!relPage) return null;
                  const relDb = useDatabaseStore.getState().databases[relPage.databaseId];
                  const titlePropId = relDb?.titlePropertyId;
                  const title = titlePropId ? relPage.properties[titlePropId] : relPage.id;
                  return (
                    <button key={rid} onClick={e => { e.stopPropagation(); onOpenPage(rid); }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 font-medium shrink-0 max-w-[140px]">
                      <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{title || 'Untitled'}</span>
                    </button>
                  );
                })}
              </div>
            ) : <span className="text-gray-400 text-sm">Empty</span>;
            break;
          }

          case 'assigned_to': {
            const assignees: string[] = Array.isArray(value) ? value : (value ? [value] : []);
            content = assignees.length > 0 ? (
              <div className={`flex items-center ${wrapContent ? 'flex-wrap gap-1' : '-space-x-1.5'}`}>
                {assignees.map((name, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shrink-0" title={name}>
                    {String(name).charAt(0).toUpperCase()}
                  </div>
                ))}
                {!wrapContent && assignees.length > 1 && (
                  <span className="text-xs text-gray-500 ml-2">{assignees.length} assigned</span>
                )}
              </div>
            ) : <span className="text-gray-400 text-sm">Unassigned</span>;
            break;
          }

          case 'due_date': {
            const dateVal = value ? new Date(value) : null;
            const now = new Date();
            let dueBadge = '';
            let dueColor = 'text-gray-700';
            if (dateVal) {
              const diffDays = Math.ceil((dateVal.getTime() - now.getTime()) / (1000*60*60*24));
              if (diffDays < 0) { dueBadge = 'Overdue'; dueColor = 'text-red-600'; }
              else if (diffDays === 0) { dueBadge = 'Today'; dueColor = 'text-orange-600'; }
              else if (diffDays <= 3) { dueBadge = `${diffDays}d left`; dueColor = 'text-yellow-600'; }
            }
            content = isEditing ? (
              <input autoFocus type="date" value={dateVal ? dateVal.toISOString().split('T')[0] : ''}
                onChange={e => onUpdateProperty(page.id, prop.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                onBlur={() => onStopEditing()}
                onKeyDown={e => { if (e.key === 'Enter') { onStopEditing(); tableRef.current?.focus(); } }}
                className="w-full bg-transparent outline-none text-sm text-gray-700" />
            ) : dateVal ? (
              <div className="flex items-center gap-1.5 text-sm truncate">
                {dueBadge && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    dueBadge === 'Overdue' ? 'bg-red-100 text-red-700' :
                    dueBadge === 'Today' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'}`}>{dueBadge}</span>
                )}
                <span className={dueColor}>{dateVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            ) : <span className="text-gray-400">Empty</span>;
            break;
          }

          case 'custom': {
            const dt = prop.customConfig?.dataType || 'string';
            if (isEditing) {
              content = (
                <input autoFocus
                  type={dt === 'integer' || dt === 'float' ? 'number' : dt === 'timestamp' ? 'datetime-local' : 'text'}
                  step={dt === 'float' ? '0.01' : undefined}
                  value={dt === 'boolean' ? undefined : (value ?? '')}
                  onChange={e => {
                    let v: any = e.target.value;
                    if (dt === 'integer') v = parseInt(v) || 0;
                    else if (dt === 'float') v = parseFloat(v) || 0;
                    else if (dt === 'json') { try { v = JSON.parse(v); } catch { /* keep string */ } }
                    onUpdateProperty(page.id, prop.id, v);
                  }}
                  onBlur={() => onStopEditing()}
                  onKeyDown={e => { if (e.key === 'Enter') { onStopEditing(); tableRef.current?.focus(); } }}
                  className="w-full bg-transparent outline-none text-sm font-mono" />
              );
            } else if (dt === 'boolean') {
              content = (
                <div className="flex items-center justify-center">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer ${value ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'}`}>
                    {value && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                </div>
              );
            } else if (dt === 'timestamp') {
              content = <div className="text-sm text-gray-500 font-mono truncate">{value ? new Date(value).toLocaleString() : <span className="text-gray-400">—</span>}</div>;
            } else if (dt === 'json') {
              content = <div className="text-sm text-gray-600 font-mono truncate">{value ? JSON.stringify(value) : <span className="text-gray-400">{'{}'}</span>}</div>;
            } else {
              const display = value != null && value !== '' ? String(value) : null;
              content = display ? (
                <div className={`text-sm text-gray-900 font-mono ${dt === 'integer' || dt === 'float' ? 'tabular-nums' : ''} truncate`}>
                  {dt === 'integer' || dt === 'float' ? Number(display).toLocaleString() : display}
                </div>
              ) : <span className="text-gray-400 text-sm">Empty</span>;
            }
            break;
          }

          case 'created_time': case 'last_edited_time': {
            const timeVal = prop.type === 'created_time' ? page.createdAt : page.updatedAt;
            content = <div className="text-sm text-gray-500 truncate whitespace-nowrap">{timeVal ? new Date(timeVal).toLocaleString() : '—'}</div>;
            break;
          }

          case 'created_by': case 'last_edited_by': {
            const userVal = prop.type === 'created_by' ? page.createdBy : page.lastEditedBy;
            content = userVal ? (
              <div className="flex items-center gap-1.5 overflow-hidden">
                <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {String(userVal).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-600 truncate">{userVal}</span>
              </div>
            ) : <span className="text-gray-400 text-sm">—</span>;
            break;
          }

          default:
            content = <span className="text-sm text-gray-500 truncate block">{String(value || '')}</span>;
        }

        return (
          <td key={prop.id}
            className={`px-3 py-1.5 ${cellBorder} border-b border-gray-200 ${isFocused ? 'overflow-visible' : 'overflow-hidden'} ${wrapContent ? 'align-top' : 'align-middle'} relative ${focusRing}`}
            style={{
              width: getColWidth(prop.id), minWidth: getColWidth(prop.id), maxWidth: getColWidth(prop.id),
              cursor: fillDrag ? CURSORS.crosshair : isEditing ? undefined : CURSORS.cell,
            }}
            onClick={handleClick}>
            {content}
            {isFocused && !isEditing && (
              <div
                className="absolute w-[7px] h-[7px] bg-emerald-500 border border-white rounded-[1px] z-20"
                style={{ bottom: -3, right: -3, cursor: CURSORS.crosshair }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onFillDragStart(prop.id, rowIdx);
                }}
              />
            )}
          </td>
        );
      })}
      <td className="border-b border-gray-200 px-1">
        <button
          className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 rounded hover:bg-gray-100"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onRowMenu(page.id, rect.left, rect.bottom);
          }}>
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </td>
      <td className="border-b border-gray-200" />
    </tr>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export function TableView() {
  // ── Reactive state (selective subscriptions — only re-render when these change) ──
  const activeViewId = useDatabaseStore(s => s.activeViewId);
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
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [configPanel, setConfigPanel] = useState<{ prop: SchemaProperty; position: { top: number; left: number } } | null>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [formulaEditor, setFormulaEditor] = useState<{ propId: string } | null>(null);
  // ── Fill handle drag state ──
  const [fillDrag, setFillDrag] = useState<{
    sourcePropId: string; sourceRowIdx: number; currentRowIdx: number;
  } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Reset visible count when the view or load limit changes
  useEffect(() => { setVisibleCount(null); }, [activeViewId, view?.settings?.loadLimit]);

  // ── Fill handle: global mouse listeners during drag ──
  const handleFillMove = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const row = target.closest('tr[data-row-idx]');
    if (row) {
      const rowIdx = Number(row.getAttribute('data-row-idx'));
      if (!isNaN(rowIdx)) setFillDrag(prev => prev ? { ...prev, currentRowIdx: rowIdx } : null);
    }
  }, []);

  const handleFillEnd = useCallback(() => {
    setFillDrag(prev => {
      if (!prev) return null;
      const { sourcePropId, sourceRowIdx, currentRowIdx } = prev;
      const store = useDatabaseStore.getState();
      const v = activeViewId ? store.views[activeViewId] : null;
      if (!v) return null;
      const allPages = store.getPagesForView(v.id);
      const sourceVal = allPages[sourceRowIdx]?.properties[sourcePropId];
      const minR = Math.min(sourceRowIdx, currentRowIdx);
      const maxR = Math.max(sourceRowIdx, currentRowIdx);
      for (let i = minR; i <= maxR; i++) {
        if (i !== sourceRowIdx && allPages[i]) {
          store.updatePageProperty(allPages[i].id, sourcePropId, sourceVal);
        }
      }
      return null;
    });
  }, [activeViewId]);

  useEffect(() => {
    if (fillDrag) {
      document.addEventListener('mousemove', handleFillMove);
      document.addEventListener('mouseup', handleFillEnd);
      return () => {
        document.removeEventListener('mousemove', handleFillMove);
        document.removeEventListener('mouseup', handleFillEnd);
      };
    }
  }, [fillDrag, handleFillMove, handleFillEnd]);

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

  // ─── KEYBOARD NAVIGATION ──────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focusedCell) return;
    const pi = displayedPages.findIndex(p => p.id === focusedCell.pageId);
    const ci = visibleProps.findIndex(p => p.id === focusedCell.propId);

    if (editingCell) {
      if (e.key === 'Escape') { setEditingCell(null); tableRef.current?.focus(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        setEditingCell(null);
        const nextCI = e.shiftKey ? Math.max(0, ci - 1) : Math.min(visibleProps.length - 1, ci + 1);
        setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[nextCI].id });
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp': if (pi > 0) setFocusedCell({ pageId: displayedPages[pi - 1].id, propId: focusedCell.propId }); e.preventDefault(); break;
      case 'ArrowDown': if (pi < displayedPages.length - 1) setFocusedCell({ pageId: displayedPages[pi + 1].id, propId: focusedCell.propId }); e.preventDefault(); break;
      case 'ArrowLeft': if (ci > 0) setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[ci - 1].id }); e.preventDefault(); break;
      case 'ArrowRight': if (ci < visibleProps.length - 1) setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[ci + 1].id }); e.preventDefault(); break;
      case 'Enter':
        if (e.shiftKey) {
          // Shift+Enter: create new record below
          addPage(database.id);
        } else {
          setEditingCell(focusedCell);
        }
        e.preventDefault(); break;
      case 'Tab':
        e.preventDefault();
        const nextCI = e.shiftKey ? Math.max(0, ci - 1) : Math.min(visibleProps.length - 1, ci + 1);
        setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[nextCI].id });
        break;
      case 'Delete': case 'Backspace':
        if (focusedCell) {
          const prop = database.properties[focusedCell.propId];
          if (prop?.type !== 'title' && prop?.type !== 'id' && prop?.type !== 'created_time' && prop?.type !== 'last_edited_time' && prop?.type !== 'created_by' && prop?.type !== 'last_edited_by') {
            updatePageProperty(focusedCell.pageId, focusedCell.propId, prop?.type === 'checkbox' ? false : prop?.type === 'multi_select' ? [] : '');
          }
        }
        break;
    }
  };

  // ─── COLUMN RESIZE ───────────────────────────────────────
  const handleResizeStart = (e: React.MouseEvent, propId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = getColWidth(propId);

    let latestWidth = startWidth;
    let rafId = 0;
    const handleMove = (ev: MouseEvent) => {
      latestWidth = Math.max(80, startWidth + ev.clientX - startX);
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const s = useDatabaseStore.getState();
          const curView = s.views[view.id];
          if (curView) {
            s.updateViewSettings(view.id, {
              columnWidths: { ...(curView.settings?.columnWidths || {}), [propId]: latestWidth }
            });
          }
        });
      }
    };
    const handleUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setResizingCol(null);
      const s = useDatabaseStore.getState();
      const curView = s.views[view.id];
      if (curView) {
        s.updateViewSettings(view.id, {
          columnWidths: { ...(curView.settings?.columnWidths || {}), [propId]: latestWidth }
        });
      }
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    setResizingCol(propId);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

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

  const handleFillDragStart = useCallback((propId: string, rowIdx: number) => {
    setFillDrag({ sourcePropId: propId, sourceRowIdx: rowIdx, currentRowIdx: rowIdx });
  }, []);

  const handleFormulaEdit = useCallback((propId: string) => {
    setFormulaEditor({ propId });
  }, []);

  const handleRowMenu = useCallback((pageId: string, x: number, y: number) => {
    setRowMenu({ pageId, x, y });
  }, []);

  const getColWidth = useCallback((propId: string) => {
    const s = useDatabaseStore.getState();
    const v = s.views[s.activeViewId!];
    return v?.settings?.columnWidths?.[propId] || 180;
  }, []);

  // ─── HEADER CLICK → Property Config Panel ─────────────────
  const handleHeaderClick = (e: React.MouseEvent, prop: SchemaProperty) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setConfigPanel({
      prop,
      position: { top: rect.bottom + 4, left: rect.left }
    });
  };

  // ─── ADD PROPERTY TYPES FOR THE + COLUMN ──────────────────
  const addPropertyTypes: [string, string][] = [
    ['Text', 'text'], ['Number', 'number'], ['Select', 'select'], ['Multi-select', 'multi_select'],
    ['Status', 'status'], ['Date', 'date'], ['Checkbox', 'checkbox'], ['Person', 'person'],
    ['URL', 'url'], ['Email', 'email'], ['Phone', 'phone'], ['Location', 'place'],
    ['Files & media', 'files_media'], ['ID', 'id'], ['Relation', 'relation'],
    ['Formula', 'formula'], ['Rollup', 'rollup'], ['Button', 'button'],
    ['Assigned to', 'assigned_to'], ['Due date', 'due_date'], ['Custom', 'custom'],
  ];

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
          onFillDragStart={handleFillDragStart}
          onFormulaEdit={handleFormulaEdit}
          onRowMenu={handleRowMenu}
          tableRef={tableRef}
        />
      );
    });

  return (
    <div className="flex-1 overflow-auto bg-white outline-none" tabIndex={0} onKeyDown={handleKeyDown} ref={tableRef}>
      <div className="inline-block min-w-full">
        <table className="min-w-full text-left border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-gray-50 border-b border-gray-200">
              {showRowNumbers && (
                <th className="w-10 px-2 py-2 text-xs font-medium text-gray-400 border-r border-gray-200 bg-gray-50 text-center">#</th>
              )}
              {visibleProps.map(prop => (
                <th key={prop.id}
                  className={`px-3 py-2 text-xs font-medium text-gray-500 ${showVerticalLines ? 'border-r' : ''} border-gray-200 bg-gray-50 group relative select-none`}
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
                    className="flex items-center justify-between w-full hover:bg-gray-100 px-1 py-0.5 rounded transition-colors outline-none">
                    <div className="flex items-center gap-1.5">
                      <PropIcon type={prop.type} className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{prop.name}</span>
                    </div>
                    <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 shrink-0" />
                  </button>
                  <div className={`absolute top-0 right-0 w-1 h-full hover:bg-blue-500 transition-colors ${resizingCol === prop.id ? 'bg-blue-500' : ''}`}
                    style={{ cursor: CURSORS.colResize }}
                    onMouseDown={e => handleResizeStart(e, prop.id)} />
                </th>
              ))}
              <th className="w-10 px-2 py-2 border-gray-200 text-center bg-gray-50">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-colors"><Plus className="w-4 h-4" /></button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className="w-48 bg-white rounded-lg p-1 shadow-xl border border-gray-200 text-sm z-50">
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">Property Type</div>
                      {addPropertyTypes.map(([label, type]) => (
                        <DropdownMenu.Item key={type} onSelect={() => addProperty(database.id, `New ${label}`, type as any)}
                          className="flex items-center gap-2 px-2 py-1.5 outline-none hover:bg-gray-50 rounded cursor-pointer">
                          <PropIcon type={type} className="w-4 h-4 text-gray-400" /> {label}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </th>
              <th className="w-10 px-2 py-2 text-center bg-gray-50">
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content align="end" className="w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-2 text-sm z-50">
                      <div className="relative mb-2">
                        <Search className="w-4 h-4 absolute left-2 top-2 text-gray-400" />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                          className="w-full bg-gray-50 rounded-md pl-8 pr-2 py-1.5 outline-none focus:ring-1 ring-blue-400 text-sm" placeholder="Search properties..." />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredVisible.length > 0 && (
                          <div className="mb-2">
                            <div className="flex justify-between items-center px-2 py-1 text-xs text-gray-400 font-medium">
                              <span>Shown in table</span>
                              <button onClick={() => hideAllProperties(view.id)} className="hover:text-gray-700">Hide all</button>
                            </div>
                            {filteredVisible.map(p => (
                              <div key={p.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <GripVertical className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                                  <PropIcon type={p.type} className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate text-gray-700">{p.name}</span>
                                </div>
                                <button onClick={() => togglePropertyVisibility(view.id, p.id)} className="shrink-0 ml-2">
                                  <Eye className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {filteredHidden.length > 0 && (
                          <div>
                            <div className="px-2 py-1 text-xs text-gray-400 font-medium">Hidden in table</div>
                            {filteredHidden.map(p => (
                              <div key={p.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <GripVertical className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                                  <PropIcon type={p.type} className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate text-gray-700">{p.name}</span>
                                </div>
                                <button onClick={() => togglePropertyVisibility(view.id, p.id)} className="shrink-0 ml-2">
                                  <EyeOff className="w-4 h-4 text-gray-400 hover:text-gray-700" />
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
                  const bgColor = colorParts[0] || 'bg-gray-200';
                  const textColor = colorParts[1] || 'text-gray-700';

                  return (
                    <React.Fragment key={group.groupId}>
                      {/* ── Group header row ── */}
                      <tr className="group/hdr">
                        <td colSpan={colCount} className="p-0 border-b border-gray-200 bg-gray-50/80">
                          <div className="flex items-center gap-2 px-3 py-2 select-none">
                            {/* Toggle arrow */}
                            <button
                              onClick={() => toggleGroup(group.groupId)}
                              className="p-0.5 hover:bg-gray-200 rounded transition-colors shrink-0"
                            >
                              <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`} />
                            </button>

                            {/* Group label badge */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${bgColor} ${textColor}`}>
                              {group.groupLabel}
                            </span>

                            {/* Count */}
                            <span className="text-xs text-gray-400 tabular-nums">{group.pages.length}</span>

                            {/* Hover actions */}
                            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/hdr:opacity-100 transition-opacity">
                              <button
                                onClick={() => addPage(database.id)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                                title="Add page to group"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
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
                          <td colSpan={colCount} className="px-8 py-3 text-sm text-gray-400 border-b border-gray-200 bg-gray-50/30">
                            No pages
                          </td>
                        </tr>
                      )}

                      {/* + New in group */}
                      {!isCollapsed && (
                        <tr>
                          <td colSpan={colCount} className="p-0 border-b border-gray-100">
                            <button onClick={() => addPage(database.id)}
                              className="w-full text-left px-8 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-blue-50/40 transition-colors flex items-center gap-1.5">
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
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-blue-50/50 transition-colors flex items-center gap-2 border-b border-transparent hover:border-blue-200">
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
                    <td colSpan={colCount} className="p-0 border-b border-gray-200">
                      <button
                        onClick={() => setVisibleCount(Math.min(currentLimit + loadLimit, pages.length))}
                        className="w-full text-left px-4 py-2 text-sm text-blue-500 hover:text-blue-700 hover:bg-blue-50/60 transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <ChevronDown className="w-4 h-4" />
                          Load more
                        </span>
                        <span className="text-xs text-gray-400 tabular-nums">
                          {currentLimit} of {pages.length}
                        </span>
                      </button>
                    </td>
                  </tr>
                )}

                <tr>
                  <td colSpan={colCount} className="p-0">
                    <button onClick={() => addPage(database.id)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-blue-50/50 transition-colors flex items-center gap-2 border-b border-transparent hover:border-blue-200">
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
            className="fixed z-50 min-w-[160px] bg-white rounded-lg p-1 shadow-xl border border-gray-200 text-sm"
            style={{ left: rowMenu.x, top: rowMenu.y }}
          >
            <button onClick={() => { openPage(rowMenu.pageId); setRowMenu(null); }}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer w-full text-left">
              <ExternalLink className="w-4 h-4 text-gray-400" /> Open page
            </button>
            <button onClick={() => { duplicatePage(rowMenu.pageId); setRowMenu(null); }}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer w-full text-left">
              <Copy className="w-4 h-4 text-gray-400" /> Duplicate
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <button onClick={() => { deletePage(rowMenu.pageId); setRowMenu(null); }}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-red-50 rounded cursor-pointer w-full text-left text-red-600">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
