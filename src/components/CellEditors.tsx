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


// ═══════════════════════════════════════════════════════════════════════════════
// ROLLUP CELL EDITOR
// ═══════════════════════════════════════════════════════════════════════════════
// Notion-style rollup config panel:
//   • Relation picker (which relation property to use)
//   • Property picker (which property from the related DB)
//   • Calculate function picker (Show original, Count, Percent, etc.)

const ROLLUP_FUNCTIONS: { value: RollupFunction; label: string; group: string }[] = [
  { value: 'show_original',       label: 'Show original',       group: 'Show' },
  { value: 'show_unique',         label: 'Show unique values',  group: 'Show' },
  { value: 'count_all',           label: 'Count all',           group: 'Count' },
  { value: 'count_values',        label: 'Count values',        group: 'Count' },
  { value: 'count_unique_values', label: 'Count unique values', group: 'Count' },
  { value: 'count_empty',         label: 'Count empty',         group: 'Count' },
  { value: 'count_not_empty',     label: 'Count not empty',     group: 'Count' },
  { value: 'percent_empty',       label: 'Percent empty',       group: 'Percent' },
  { value: 'percent_not_empty',   label: 'Percent not empty',   group: 'Percent' },
  { value: 'sum',                 label: 'Sum',                 group: 'Math' },
  { value: 'average',             label: 'Average',             group: 'Math' },
  { value: 'median',              label: 'Median',              group: 'Math' },
  { value: 'min',                 label: 'Min',                 group: 'Math' },
  { value: 'max',                 label: 'Max',                 group: 'Math' },
  { value: 'range',               label: 'Range',               group: 'Math' },
];

interface RollupCellEditorProps {
  property: SchemaProperty;
  databaseId: string;
  onClose: () => void;
}

export function RollupCellEditor({ property, databaseId, onClose }: RollupCellEditorProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const rect = useCellRect(measureRef);

  const databases = useDatabaseStore(s => s.databases);
  const updateProperty = useDatabaseStore(s => s.updateProperty);

  const db = databases[databaseId];
  const relationProps = useMemo(
    () => Object.values(db?.properties || {}).filter(p => p.type === 'relation' && p.relationConfig),
    [db?.properties]
  );

  const currentConfig = property.rollupConfig;
  const [relationPropId, setRelationPropId] = useState(currentConfig?.relationPropertyId || '');
  const [targetPropId, setTargetPropId] = useState(currentConfig?.targetPropertyId || '');
  const [fn, setFn] = useState<RollupFunction>(currentConfig?.function || 'show_original');

  const [showRelPicker, setShowRelPicker] = useState(false);
  const [showPropPicker, setShowPropPicker] = useState(false);
  const [showCalcPicker, setShowCalcPicker] = useState(false);
  const [calcSubmenu, setCalcSubmenu] = useState<string | null>(null);

  // Resolve target database from selected relation
  const selectedRelProp = relationPropId ? db?.properties[relationPropId] : null;
  const targetDbId = selectedRelProp?.relationConfig?.databaseId;
  const targetDb = targetDbId ? databases[targetDbId] : null;
  const targetProps = targetDb ? Object.values(targetDb.properties) : [];
  const selectedTargetProp = targetPropId ? targetDb?.properties[targetPropId] : null;
  const selectedFnLabel = ROLLUP_FUNCTIONS.find(f => f.value === fn)?.label || 'Show original';

  const handleSave = (newRelId?: string, newPropId?: string, newFn?: RollupFunction) => {
    const rId = newRelId ?? relationPropId;
    const pId = newPropId ?? targetPropId;
    const func = newFn ?? fn;
    updateProperty(databaseId, property.id, {
      type: 'rollup',
      rollupConfig: {
        relationPropertyId: rId,
        targetPropertyId: pId,
        function: func,
        displayAs: currentConfig?.displayAs || 'number',
      },
    });
  };

  // Group functions for sub-menus
  const fnGroups = useMemo(() => {
    const groups: Record<string, typeof ROLLUP_FUNCTIONS> = {};
    for (const f of ROLLUP_FUNCTIONS) {
      (groups[f.group] ||= []).push(f);
    }
    return groups;
  }, []);

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
              width: Math.max(rect.width, 280),
              maxHeight: '70vh',
            }}
            onClick={e => e.stopPropagation()}>

            <div className="flex flex-col min-w-[200px] max-h-[70vh]">
              <div className="overflow-y-auto flex-1">
                {/* ─── Relation section ─── */}
                <div className="px-2 pt-2">
                  <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Relation</div>
                  <button
                    onClick={() => { setShowRelPicker(!showRelPicker); setShowPropPicker(false); setShowCalcPicker(false); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 text-sm transition-colors">
                    <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="flex-1 text-left truncate text-gray-700">
                      {selectedRelProp?.name || 'Select relation…'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showRelPicker ? 'rotate-180' : ''}`} />
                  </button>
                  {showRelPicker && (
                    <div className="ml-2 mt-1 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden mb-1">
                      {relationProps.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-400">No relation properties</div>
                      ) : relationProps.map(rp => (
                        <button key={rp.id}
                          onClick={() => {
                            setRelationPropId(rp.id);
                            setTargetPropId('');
                            setShowRelPicker(false);
                            handleSave(rp.id, '', fn);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white transition-colors ${rp.id === relationPropId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate">{rp.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── Property section ─── */}
                <div className="px-2 pt-1 border-t border-gray-100 mt-2">
                  <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Property</div>
                  <button
                    onClick={() => { setShowPropPicker(!showPropPicker); setShowRelPicker(false); setShowCalcPicker(false); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 text-sm transition-colors"
                    disabled={!targetDb}>
                    <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className={`flex-1 text-left truncate ${targetDb ? 'text-gray-700' : 'text-gray-400'}`}>
                      {selectedTargetProp?.name || (targetDb ? 'Select property…' : 'Select relation first')}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showPropPicker ? 'rotate-180' : ''}`} />
                  </button>
                  {showPropPicker && targetDb && (
                    <div className="ml-2 mt-1 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden max-h-40 overflow-y-auto mb-1">
                      {targetProps.map(tp => (
                        <button key={tp.id}
                          onClick={() => {
                            setTargetPropId(tp.id);
                            setShowPropPicker(false);
                            handleSave(relationPropId, tp.id, fn);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white transition-colors ${tp.id === targetPropId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                          <span className="truncate">{tp.name}</span>
                          <span className="text-xs text-gray-400 ml-auto shrink-0">{tp.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── Calculate section ─── */}
                <div className="px-2 pt-1 border-t border-gray-100 mt-2 pb-2">
                  <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Calculate</div>
                  <button
                    onClick={() => { setShowCalcPicker(!showCalcPicker); setShowRelPicker(false); setShowPropPicker(false); setCalcSubmenu(null); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 text-sm transition-colors">
                    <BarChart2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="flex-1 text-left truncate text-gray-700">
                      {selectedFnLabel}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showCalcPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {showCalcPicker && (
                    <div className="ml-2 mt-1 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden mb-1">
                      {/* Show original / Show unique - top-level items */}
                      {ROLLUP_FUNCTIONS.filter(f => f.group === 'Show').map(f => (
                        <button key={f.value}
                          onClick={() => {
                            setFn(f.value);
                            setShowCalcPicker(false);
                            handleSave(relationPropId, targetPropId, f.value);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white transition-colors ${fn === f.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                          <span className="truncate">{f.label}</span>
                          {fn === f.value && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 ml-auto shrink-0" />}
                        </button>
                      ))}

                      {/* Count sub-menu */}
                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => setCalcSubmenu(calcSubmenu === 'Count' ? null : 'Count')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white transition-colors text-gray-700">
                          <span className="flex-1 text-left">Count</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${calcSubmenu === 'Count' ? 'rotate-90' : ''}`} />
                        </button>
                        {calcSubmenu === 'Count' && (
                          <div className="bg-white border-t border-gray-50">
                            {(fnGroups['Count'] || []).map(f => (
                              <button key={f.value}
                                onClick={() => {
                                  setFn(f.value);
                                  setShowCalcPicker(false);
                                  setCalcSubmenu(null);
                                  handleSave(relationPropId, targetPropId, f.value);
                                }}
                                className={`w-full flex items-center gap-2 px-5 py-1.5 text-sm hover:bg-gray-50 transition-colors ${fn === f.value ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                <span className="truncate">{f.label}</span>
                                {fn === f.value && <CheckCircle2 className="w-3 h-3 text-blue-500 ml-auto shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Percent sub-menu */}
                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => setCalcSubmenu(calcSubmenu === 'Percent' ? null : 'Percent')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white transition-colors text-gray-700">
                          <span className="flex-1 text-left">Percent</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${calcSubmenu === 'Percent' ? 'rotate-90' : ''}`} />
                        </button>
                        {calcSubmenu === 'Percent' && (
                          <div className="bg-white border-t border-gray-50">
                            {(fnGroups['Percent'] || []).map(f => (
                              <button key={f.value}
                                onClick={() => {
                                  setFn(f.value);
                                  setShowCalcPicker(false);
                                  setCalcSubmenu(null);
                                  handleSave(relationPropId, targetPropId, f.value);
                                }}
                                className={`w-full flex items-center gap-2 px-5 py-1.5 text-sm hover:bg-gray-50 transition-colors ${fn === f.value ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                <span className="truncate">{f.label}</span>
                                {fn === f.value && <CheckCircle2 className="w-3 h-3 text-blue-500 ml-auto shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Math sub-menu (only for numeric properties) */}
                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => setCalcSubmenu(calcSubmenu === 'Math' ? null : 'Math')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white transition-colors text-gray-700">
                          <span className="flex-1 text-left">Math</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${calcSubmenu === 'Math' ? 'rotate-90' : ''}`} />
                        </button>
                        {calcSubmenu === 'Math' && (
                          <div className="bg-white border-t border-gray-50">
                            {(fnGroups['Math'] || []).map(f => (
                              <button key={f.value}
                                onClick={() => {
                                  setFn(f.value);
                                  setShowCalcPicker(false);
                                  setCalcSubmenu(null);
                                  handleSave(relationPropId, targetPropId, f.value);
                                }}
                                className={`w-full flex items-center gap-2 px-5 py-1.5 text-sm hover:bg-gray-50 transition-colors ${fn === f.value ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                <span className="truncate">{f.label}</span>
                                {fn === f.value && <CheckCircle2 className="w-3 h-3 text-blue-500 ml-auto shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}


