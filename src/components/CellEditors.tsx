import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { SchemaProperty, SelectOption, StatusGroup, RollupFunction, RollupDisplayAs } from '../types/database';
import {
  X, Search, ArrowUpRight, ChevronDown, ChevronRight, ExternalLink,
  CheckCircle2, CircleDot, Fingerprint, GitBranch, Hash, Settings,
  Plus, Database as DbIcon, BarChart2
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED: Portal wrapper that anchors to a cell's bounding rect
// ═══════════════════════════════════════════════════════════════════════════════

function useCellRect(measureRef: React.RefObject<HTMLDivElement | null>) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (measureRef.current) {
      const td = measureRef.current.closest('td');
      if (td) setRect(td.getBoundingClientRect());
    }
  }, [measureRef]);
  return rect;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATION CELL EDITOR
// ═══════════════════════════════════════════════════════════════════════════════
// When you click on a relation cell, this panel opens:
//   • Search input "Link or create a page…"
//   • List of pages from the related database to pick from
//   • Click to add/remove as relation references

interface RelationCellEditorProps {
  property: SchemaProperty;
  value: any;
  pageId: string;
  databaseId: string;
  onUpdate: (v: any) => void;
  onClose: () => void;
}

export function RelationCellEditor({ property, value, pageId, databaseId, onUpdate, onClose }: RelationCellEditorProps) {
  const [search, setSearch] = useState('');
  const measureRef = useRef<HTMLDivElement>(null);
  const rect = useCellRect(measureRef);

  const databases = useDatabaseStore(s => s.databases);
  const pages = useDatabaseStore(s => s.pages);

  const targetDbId = property.relationConfig?.databaseId;
  const targetDb = targetDbId ? databases[targetDbId] : null;
  const titlePropId = targetDb?.titlePropertyId;

  const selectedIds: string[] = Array.isArray(value) ? value : [];

  // Get all pages from the target database
  const targetPages = useMemo(() => {
    if (!targetDbId) return [];
    return Object.values(pages)
      .filter(p => p.databaseId === targetDbId && p.id !== pageId)
      .map(p => ({
        id: p.id,
        title: titlePropId ? (p.properties[titlePropId] || 'Untitled') : p.id,
      }));
  }, [targetDbId, pages, pageId, titlePropId]);

  const filteredPages = useMemo(() => {
    const q = search.toLowerCase();
    return targetPages.filter(p => p.title.toLowerCase().includes(q));
  }, [targetPages, search]);

  const toggleRelation = (rid: string) => {
    const next = selectedIds.includes(rid)
      ? selectedIds.filter(id => id !== rid)
      : [...selectedIds, rid];
    onUpdate(next);
  };

  const removeRelation = (rid: string) => {
    onUpdate(selectedIds.filter(id => id !== rid));
  };

  if (!targetDb) {
    // Relation not configured — prompt user
    return (
      <>
        <div ref={measureRef} className="w-full h-0" />
        {rect && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
            <div
              className="fixed min-w-[280px] bg-white shadow-xl border border-gray-200 rounded-lg z-[9999] overflow-hidden"
              style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 280) }}
              onClick={e => e.stopPropagation()}>
              <div className="p-4 text-center">
                <ExternalLink className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Relation not configured yet.</p>
                <p className="text-xs text-gray-400 mt-1">Click the column header → "Edit relation" to set it up.</p>
              </div>
            </div>
          </>,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
          <div
            className="fixed bg-white shadow-xl border border-gray-200 rounded-lg z-[9999] overflow-hidden"
            style={{
              top: rect.bottom + 2,
              left: rect.left,
              width: Math.max(rect.width, 340),
              maxWidth: 560,
              maxHeight: '70vh',
            }}
            onClick={e => e.stopPropagation()}>

            {/* ─── Search bar ─── */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
                placeholder="Link or create a page…"
              />
              <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                <span>In</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                  {targetDb.icon && <span>{targetDb.icon}</span>}
                  <span className="max-w-[100px] truncate">{targetDb.name}</span>
                </span>
              </div>
            </div>

            {/* ─── Selected relations (chips) ─── */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-100">
                {selectedIds.map(rid => {
                  const tp = targetPages.find(p => p.id === rid);
                  return (
                    <span key={rid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                      <ArrowUpRight className="w-2.5 h-2.5" />
                      <span className="max-w-[120px] truncate">{tp?.title || 'Untitled'}</span>
                      <button onClick={() => removeRelation(rid)} className="hover:text-blue-900 ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* ─── Available pages ─── */}
            <div className="max-h-[300px] overflow-y-auto">
              {filteredPages.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  {search ? 'No matching pages' : 'No pages in this database'}
                </div>
              ) : (
                filteredPages.map(p => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleRelation(p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                      <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="flex-1 truncate text-gray-700">{p.title}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}


