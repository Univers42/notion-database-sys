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
              className="fixed min-w-[280px] bg-surface-primary shadow-xl border border-line rounded-lg z-[9999] overflow-hidden"
              style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 280) }}
              onClick={e => e.stopPropagation()}>
              <div className="p-4 text-center">
                <ExternalLink className="w-8 h-8 text-ink-disabled mx-auto mb-2" />
                <p className="text-sm text-ink-secondary">Relation not configured yet.</p>
                <p className="text-xs text-ink-muted mt-1">Click the column header → "Edit relation" to set it up.</p>
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
            className="fixed bg-surface-primary shadow-xl border border-line rounded-lg z-[9999] overflow-hidden"
            style={{
              top: rect.bottom + 2,
              left: rect.left,
              width: Math.max(rect.width, 340),
              maxWidth: 560,
              maxHeight: '70vh',
            }}
            onClick={e => e.stopPropagation()}>

            {/* ─── Search bar ─── */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-line-light bg-surface-secondary-soft">
              <Search className="w-4 h-4 text-ink-muted shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-placeholder"
                placeholder="Link or create a page…"
              />
              <div className="flex items-center gap-1 text-xs text-ink-muted shrink-0">
                <span>In</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-tertiary rounded text-ink-body-light font-medium">
                  {targetDb.icon && <span>{targetDb.icon}</span>}
                  <span className="max-w-[100px] truncate">{targetDb.name}</span>
                </span>
              </div>
            </div>

            {/* ─── Selected relations (chips) ─── */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-line-light">
                {selectedIds.map(rid => {
                  const tp = targetPages.find(p => p.id === rid);
                  return (
                    <span key={rid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-soft text-accent-text text-xs font-medium">
                      <ArrowUpRight className="w-2.5 h-2.5" />
                      <span className="max-w-[120px] truncate">{tp?.title || 'Untitled'}</span>
                      <button onClick={() => removeRelation(rid)} className="hover:text-hover-accent-text-bolder ml-0.5">
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
                <div className="px-4 py-6 text-center text-sm text-ink-muted">
                  {search ? 'No matching pages' : 'No pages in this database'}
                </div>
              ) : (
                filteredPages.map(p => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleRelation(p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-hover-surface transition-colors ${isSelected ? 'bg-accent-soft2' : ''}`}>
                      <ArrowUpRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                      <span className="flex-1 truncate text-ink-body">{p.title}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-accent-text-soft shrink-0" />}
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
            className="fixed bg-surface-primary shadow-xl border border-line rounded-lg z-[9999] overflow-hidden"
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
                  <div className="px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wide">Relation</div>
                  <button
                    onClick={() => { setShowRelPicker(!showRelPicker); setShowPropPicker(false); setShowCalcPicker(false); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-hover-surface text-sm transition-colors">
                    <ExternalLink className="w-4 h-4 text-ink-muted shrink-0" />
                    <span className="flex-1 text-left truncate text-ink-body">
                      {selectedRelProp?.name || 'Select relation…'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${showRelPicker ? 'rotate-180' : ''}`} />
                  </button>
                  {showRelPicker && (
                    <div className="ml-2 mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-hidden mb-1">
                      {relationProps.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-ink-muted">No relation properties</div>
                      ) : relationProps.map(rp => (
                        <button key={rp.id}
                          onClick={() => {
                            setRelationPropId(rp.id);
                            setTargetPropId('');
                            setShowRelPicker(false);
                            handleSave(rp.id, '', fn);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors ${rp.id === relationPropId ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body'}`}>
                          <ExternalLink className="w-3.5 h-3.5 text-ink-muted" />
                          <span className="truncate">{rp.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── Property section ─── */}
                <div className="px-2 pt-1 border-t border-line-light mt-2">
                  <div className="px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wide">Property</div>
                  <button
                    onClick={() => { setShowPropPicker(!showPropPicker); setShowRelPicker(false); setShowCalcPicker(false); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-hover-surface text-sm transition-colors"
                    disabled={!targetDb}>
                    <Hash className="w-4 h-4 text-ink-muted shrink-0" />
                    <span className={`flex-1 text-left truncate ${targetDb ? 'text-ink-body' : 'text-ink-muted'}`}>
                      {selectedTargetProp?.name || (targetDb ? 'Select property…' : 'Select relation first')}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${showPropPicker ? 'rotate-180' : ''}`} />
                  </button>
                  {showPropPicker && targetDb && (
                    <div className="ml-2 mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-hidden max-h-40 overflow-y-auto mb-1">
                      {targetProps.map(tp => (
                        <button key={tp.id}
                          onClick={() => {
                            setTargetPropId(tp.id);
                            setShowPropPicker(false);
                            handleSave(relationPropId, tp.id, fn);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors ${tp.id === targetPropId ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body'}`}>
                          <span className="truncate">{tp.name}</span>
                          <span className="text-xs text-ink-muted ml-auto shrink-0">{tp.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── Calculate section ─── */}
                <div className="px-2 pt-1 border-t border-line-light mt-2 pb-2">
                  <div className="px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wide">Calculate</div>
                  <button
                    onClick={() => { setShowCalcPicker(!showCalcPicker); setShowRelPicker(false); setShowPropPicker(false); setCalcSubmenu(null); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-hover-surface text-sm transition-colors">
                    <BarChart2 className="w-4 h-4 text-ink-muted shrink-0" />
                    <span className="flex-1 text-left truncate text-ink-body">
                      {selectedFnLabel}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${showCalcPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {showCalcPicker && (
                    <div className="ml-2 mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-hidden mb-1">
                      {/* Show original / Show unique - top-level items */}
                      {ROLLUP_FUNCTIONS.filter(f => f.group === 'Show').map(f => (
                        <button key={f.value}
                          onClick={() => {
                            setFn(f.value);
                            setShowCalcPicker(false);
                            handleSave(relationPropId, targetPropId, f.value);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors ${fn === f.value ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body'}`}>
                          <span className="truncate">{f.label}</span>
                          {fn === f.value && <CheckCircle2 className="w-3.5 h-3.5 text-accent-text-soft ml-auto shrink-0" />}
                        </button>
                      ))}

                      {/* Count sub-menu */}
                      <div className="border-t border-line-light">
                        <button
                          onClick={() => setCalcSubmenu(calcSubmenu === 'Count' ? null : 'Count')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors text-ink-body">
                          <span className="flex-1 text-left">Count</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-ink-muted transition-transform ${calcSubmenu === 'Count' ? 'rotate-90' : ''}`} />
                        </button>
                        {calcSubmenu === 'Count' && (
                          <div className="bg-surface-primary border-t border-line-faint">
                            {(fnGroups['Count'] || []).map(f => (
                              <button key={f.value}
                                onClick={() => {
                                  setFn(f.value);
                                  setShowCalcPicker(false);
                                  setCalcSubmenu(null);
                                  handleSave(relationPropId, targetPropId, f.value);
                                }}
                                className={`w-full flex items-center gap-2 px-5 py-1.5 text-sm hover:bg-hover-surface transition-colors ${fn === f.value ? 'text-accent-text font-medium' : 'text-ink-body-light'}`}>
                                <span className="truncate">{f.label}</span>
                                {fn === f.value && <CheckCircle2 className="w-3 h-3 text-accent-text-soft ml-auto shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Percent sub-menu */}
                      <div className="border-t border-line-light">
                        <button
                          onClick={() => setCalcSubmenu(calcSubmenu === 'Percent' ? null : 'Percent')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors text-ink-body">
                          <span className="flex-1 text-left">Percent</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-ink-muted transition-transform ${calcSubmenu === 'Percent' ? 'rotate-90' : ''}`} />
                        </button>
                        {calcSubmenu === 'Percent' && (
                          <div className="bg-surface-primary border-t border-line-faint">
                            {(fnGroups['Percent'] || []).map(f => (
                              <button key={f.value}
                                onClick={() => {
                                  setFn(f.value);
                                  setShowCalcPicker(false);
                                  setCalcSubmenu(null);
                                  handleSave(relationPropId, targetPropId, f.value);
                                }}
                                className={`w-full flex items-center gap-2 px-5 py-1.5 text-sm hover:bg-hover-surface transition-colors ${fn === f.value ? 'text-accent-text font-medium' : 'text-ink-body-light'}`}>
                                <span className="truncate">{f.label}</span>
                                {fn === f.value && <CheckCircle2 className="w-3 h-3 text-accent-text-soft ml-auto shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Math sub-menu (only for numeric properties) */}
                      <div className="border-t border-line-light">
                        <button
                          onClick={() => setCalcSubmenu(calcSubmenu === 'Math' ? null : 'Math')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors text-ink-body">
                          <span className="flex-1 text-left">Math</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-ink-muted transition-transform ${calcSubmenu === 'Math' ? 'rotate-90' : ''}`} />
                        </button>
                        {calcSubmenu === 'Math' && (
                          <div className="bg-surface-primary border-t border-line-faint">
                            {(fnGroups['Math'] || []).map(f => (
                              <button key={f.value}
                                onClick={() => {
                                  setFn(f.value);
                                  setShowCalcPicker(false);
                                  setCalcSubmenu(null);
                                  handleSave(relationPropId, targetPropId, f.value);
                                }}
                                className={`w-full flex items-center gap-2 px-5 py-1.5 text-sm hover:bg-hover-surface transition-colors ${fn === f.value ? 'text-accent-text font-medium' : 'text-ink-body-light'}`}>
                                <span className="truncate">{f.label}</span>
                                {fn === f.value && <CheckCircle2 className="w-3 h-3 text-accent-text-soft ml-auto shrink-0" />}
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


// ═══════════════════════════════════════════════════════════════════════════════
// STATUS CELL EDITOR (Read-only status picker + Edit property button)
// ═══════════════════════════════════════════════════════════════════════════════
// Cell click: Shows a read-only list of status options grouped by category
//   (To-do, In progress, Complete) — user picks one to set the value.
//   An "Edit property" button opens the full PropertyConfigPanel.

interface StatusCellEditorProps {
  property: SchemaProperty;
  value: any;
  databaseId: string;
  onUpdate: (v: any) => void;
  onClose: () => void;
  onEditProperty?: () => void;
}

export function StatusCellEditor({ property, value, databaseId, onUpdate, onClose, onEditProperty }: StatusCellEditorProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const rect = useCellRect(measureRef);

  const options = property.options || [];
  const statusGroups = property.statusGroups;

  // If we have status groups, render grouped; otherwise fall back to flat list
  const hasGroups = statusGroups && statusGroups.length > 0;

  // Build groups: assign each option to its group
  const groupedOptions = useMemo(() => {
    if (!hasGroups || !statusGroups) {
      // Default grouping by convention
      const defaultGroups: { label: string; color: string; options: SelectOption[] }[] = [
        { label: 'To-do', color: 'bg-surface-muted', options: [] },
        { label: 'In progress', color: 'bg-accent-subtle', options: [] },
        { label: 'Complete', color: 'bg-success-surface-medium', options: [] },
      ];
      // Simple heuristic: first option = to-do, last = complete, rest = in progress
      options.forEach((opt, i) => {
        if (i === 0) defaultGroups[0].options.push(opt);
        else if (i === options.length - 1 && options.length > 1) defaultGroups[2].options.push(opt);
        else defaultGroups[1].options.push(opt);
      });
      return defaultGroups.filter(g => g.options.length > 0);
    }

    return statusGroups.map(sg => ({
      label: sg.label,
      color: sg.color,
      options: sg.optionIds
        .map(oid => options.find(o => o.id === oid))
        .filter((o): o is SelectOption => !!o),
    })).filter(g => g.options.length > 0);
  }, [options, statusGroups, hasGroups]);

  const handleSelect = (optId: string) => {
    onUpdate(optId);
    onClose();
  };

  // Map color tokens to dot colors
  const getDotColor = (optColor: string): string => {
    if (optColor.includes('green')) return 'bg-success';
    if (optColor.includes('blue')) return 'bg-accent';
    if (optColor.includes('red')) return 'bg-danger';
    if (optColor.includes('yellow') || optColor.includes('amber') || optColor.includes('orange')) return 'bg-warning';
    if (optColor.includes('purple') || optColor.includes('violet')) return 'bg-purple';
    if (optColor.includes('pink')) return 'bg-pink';
    if (optColor.includes('cyan') || optColor.includes('teal')) return 'bg-cyan';
    return 'bg-surface-strong';
  };

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
          <div
            className="fixed min-w-[220px] bg-surface-primary shadow-xl border border-line rounded-lg z-[9999] overflow-hidden"
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 220) }}
            onClick={e => e.stopPropagation()}>

            {/* ─── Grouped status options ─── */}
            <div className="max-h-[60vh] overflow-y-auto py-1">
              {groupedOptions.map((group, gi) => (
                <div key={gi}>
                  {gi > 0 && <div className="h-px bg-surface-tertiary mx-3 my-1" />}
                  <div className="px-3 py-1.5 text-xs font-medium text-ink-muted uppercase tracking-wide">
                    {group.label}
                  </div>
                  {group.options.map(opt => {
                    const isActive = opt.id === value;
                    const dotColor = getDotColor(opt.color);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelect(opt.id)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-hover-surface transition-colors ${isActive ? 'bg-surface-secondary' : ''}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>
                          {opt.value}
                        </span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-accent-text-soft ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Clear selection */}
              {value && (
                <>
                  <div className="h-px bg-surface-tertiary mx-3 my-1" />
                  <button
                    onClick={() => { onUpdate(null); onClose(); }}
                    className="w-full px-3 py-1.5 text-sm text-ink-secondary hover:bg-hover-surface text-left">
                    Clear status
                  </button>
                </>
              )}
            </div>

            {/* ─── Edit property button ─── */}
            {onEditProperty && (
              <>
                <div className="h-px bg-surface-tertiary" />
                <button
                  onClick={() => { onEditProperty(); onClose(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-secondary hover:bg-hover-surface hover:text-hover-text-strong transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Edit property</span>
                </button>
              </>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ID CELL EDITOR
// ═══════════════════════════════════════════════════════════════════════════════
// When you click on an ID cell, you can configure:
//   • ID format: Auto-increment, Prefixed auto-increment, UUID, Custom
//   • Prefix string (for prefixed formats)
//   • Current counter (read-only display)

type IdFormat = 'auto_increment' | 'prefixed' | 'uuid' | 'custom';

interface IdCellEditorProps {
  property: SchemaProperty;
  value: any;
  databaseId: string;
  onClose: () => void;
}

export function IdCellEditor({ property, databaseId, value, onClose }: IdCellEditorProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const rect = useCellRect(measureRef);

  const updateProperty = useDatabaseStore(s => s.updateProperty);

  // Determine current format from property config
  const currentPrefix = property.prefix || '';
  const currentCounter = property.autoIncrement || 1;

  const inferFormat = (): IdFormat => {
    if (currentPrefix && currentCounter) return 'prefixed';
    if (currentCounter) return 'auto_increment';
    return 'auto_increment';
  };

  const [format, setFormat] = useState<IdFormat>(inferFormat);
  const [prefix, setPrefix] = useState(currentPrefix);

  const formats: { value: IdFormat; label: string; desc: string; example: string }[] = [
    { value: 'auto_increment', label: 'Auto-increment', desc: 'Sequential numbers', example: `e.g. 1, 2, 3…` },
    { value: 'prefixed', label: 'Prefixed ID', desc: 'Prefix + sequential', example: `e.g. ${prefix || 'TASK-'}1, ${prefix || 'TASK-'}2…` },
    { value: 'uuid', label: 'UUID', desc: 'Unique random ID', example: 'e.g. a1b2c3d4…' },
    { value: 'custom', label: 'Custom', desc: 'Manual values', example: 'Enter manually' },
  ];

  const handleSave = (newFormat: IdFormat, newPrefix?: string) => {
    const p = newPrefix ?? prefix;
    switch (newFormat) {
      case 'auto_increment':
        updateProperty(databaseId, property.id, { prefix: '', autoIncrement: currentCounter });
        break;
      case 'prefixed':
        updateProperty(databaseId, property.id, { prefix: p || 'ID-', autoIncrement: currentCounter });
        break;
      case 'uuid':
        updateProperty(databaseId, property.id, { prefix: 'uuid', autoIncrement: undefined });
        break;
      case 'custom':
        updateProperty(databaseId, property.id, { prefix: '', autoIncrement: undefined });
        break;
    }
  };

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
          <div
            className="fixed min-w-[260px] bg-surface-primary shadow-xl border border-line rounded-lg z-[9999] overflow-hidden"
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 260) }}
            onClick={e => e.stopPropagation()}>

            {/* ─── Current value ─── */}
            <div className="px-3 py-2 bg-surface-secondary border-b border-line-light">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-ink-muted" />
                <span className="text-sm font-mono text-ink-body-light">{value || '—'}</span>
              </div>
            </div>

            {/* ─── Format picker ─── */}
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-ink-muted uppercase tracking-wide">ID Format</div>
              {formats.map(f => (
                <button
                  key={f.value}
                  onClick={() => {
                    setFormat(f.value);
                    handleSave(f.value);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-hover-surface transition-colors ${format === f.value ? 'bg-accent-soft2' : ''}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${format === f.value ? 'border-accent-border' : 'border-line-medium'}`}>
                    {format === f.value && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-body">{f.label}</div>
                    <div className="text-xs text-ink-muted">{f.desc}</div>
                    <div className="text-xs text-ink-disabled mt-0.5 font-mono">{f.example}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* ─── Prefix input (when prefixed format selected) ─── */}
            {format === 'prefixed' && (
              <div className="px-3 py-2 border-t border-line-light">
                <label className="text-xs font-medium text-ink-secondary mb-1 block">Prefix</label>
                <input
                  autoFocus
                  type="text"
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                  onBlur={() => handleSave('prefixed', prefix)}
                  onKeyDown={e => { if (e.key === 'Enter') { handleSave('prefixed', prefix); onClose(); } }}
                  className="w-full text-sm px-2.5 py-1.5 rounded-md border border-line bg-surface-secondary-soft outline-none focus:border-focus-border focus:bg-surface-primary transition-colors font-mono"
                  placeholder="TASK-"
                />
                <div className="text-xs text-ink-muted mt-1">
                  Next ID: <span className="font-mono">{prefix || 'ID-'}{currentCounter}</span>
                </div>
              </div>
            )}

            {/* ─── Counter info ─── */}
            {(format === 'auto_increment' || format === 'prefixed') && (
              <div className="px-3 py-2 border-t border-line-light bg-surface-secondary-soft">
                <div className="text-xs text-ink-muted">
                  Next auto-increment: <span className="font-mono font-medium text-ink-body-light">{currentCounter}</span>
                </div>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
