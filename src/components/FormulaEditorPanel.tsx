import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import type { SchemaProperty, Page } from '../types/database';
import { X, HelpCircle, Send, Bug, Sigma } from 'lucide-react';
import { FORMULA_FUNCTIONS, FUNCTION_CATEGORIES, getReturnTypeBadge } from './formulaEditor';
import type { FunctionDef } from './formulaEditor';
import { Sidebar } from './formulaEditor/Sidebar';
import { DocPanel } from './formulaEditor/DocPanel';

// ═══════════════════════════════════════════════════════════════════════════════

interface FormulaEditorPanelProps {
  databaseId: string;
  propertyId: string;
  onClose: () => void;
}

export function FormulaEditorPanel({ databaseId, propertyId, onClose }: FormulaEditorPanelProps) {
  const activeViewId = useActiveViewId();
  const { databases, updateProperty, resolveFormula, getPagesForView, views, pages: storePages } = useDatabaseStore();
  const db = databases[databaseId];
  const property = db?.properties[propertyId];

  const [expression, setExpression] = useState(property?.formulaConfig?.expression || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'property'; prop: SchemaProperty } | { type: 'function'; fn: FunctionDef } | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Properties', ...FUNCTION_CATEGORIES]));
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Available pages for preview ──
  const previewPages = useMemo(() => {
    if (!activeViewId) return [];
    const view = views[activeViewId];
    if (!view || view.databaseId !== databaseId) return [];
    return getPagesForView(view.id).slice(0, 20);
  }, [activeViewId, views, databaseId, getPagesForView]);

  useEffect(() => {
    if (previewPages.length > 0 && !previewPageId) setPreviewPageId(previewPages[0].id);
  }, [previewPages, previewPageId]);

  const dbProperties = useMemo(() => {
    if (!db) return [];
    return Object.values(db.properties).filter(p => p.id !== propertyId);
  }, [db, propertyId]);

  const filteredProperties = useMemo(() => {
    if (!sidebarSearch) return dbProperties;
    const q = sidebarSearch.toLowerCase();
    return dbProperties.filter(p => p.name.toLowerCase().includes(q));
  }, [dbProperties, sidebarSearch]);

  const filteredFunctions = useMemo(() => {
    if (!sidebarSearch) return FORMULA_FUNCTIONS;
    const q = sidebarSearch.toLowerCase();
    return FORMULA_FUNCTIONS.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
  }, [sidebarSearch]);

  // ── Preview result ──
  const previewResult = useMemo(() => {
    if (!expression.trim()) return { value: null, type: '', error: false };
    if (!previewPageId || !storePages[previewPageId]) return { value: null, type: '', error: false };
    try {
      const result = resolveFormula(databaseId, storePages[previewPageId], expression);
      if (result === '#ERROR') return { value: '#ERROR', type: 'Error', error: true };
      const type = typeof result === 'number' ? 'Number' : typeof result === 'boolean' ? 'Boolean' : typeof result === 'string' ? 'Text' : 'Any';
      return { value: result, type, error: false };
    } catch { return { value: '#ERROR', type: 'Error', error: true }; }
  }, [expression, previewPageId, databaseId, storePages, resolveFormula]);

  // ── Insert at cursor ──
  const insertAtCursor = useCallback((text: string) => {
    const el = editorRef.current;
    if (!el) { setExpression(prev => prev + text); return; }
    const start = el.selectionStart;
    const newExpr = expression.slice(0, start) + text + expression.slice(el.selectionEnd);
    setExpression(newExpr);
    requestAnimationFrame(() => { el.focus(); const newPos = start + text.length; el.setSelectionRange(newPos, newPos); });
  }, [expression]);

  const insertProperty = useCallback((prop: SchemaProperty) => insertAtCursor(`prop("${prop.name}")`), [insertAtCursor]);

  const insertFunction = useCallback((fn: FunctionDef) => {
    const isConstant = !fn.signature.includes('(');
    if (isConstant) insertAtCursor(fn.name);
    else {
      const hasArgs = fn.signature.includes(',') || (fn.signature.includes('(') && !fn.signature.endsWith('()'));
      insertAtCursor(hasArgs ? `${fn.name}(` : `${fn.name}()`);
    }
  }, [insertAtCursor]);

  const saveFormula = useCallback(() => {
    updateProperty(databaseId, propertyId, { formulaConfig: { expression: expression.trim() } });
    onClose();
  }, [databaseId, propertyId, expression, updateProperty, onClose]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });
  };

  const getPageTitle = (page: Page) => {
    if (!db) return 'Untitled';
    const titleProp = db.properties[db.titlePropertyId];
    return titleProp ? (page.properties[titleProp.id] as string) || 'Untitled' : 'Untitled';
  };

  // ── Close on outside-click / Escape ──
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!db || !property) return null;

  // ═══ RENDER ════════════════════════════════════════

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim-light backdrop-blur-[2px]">
      <div ref={panelRef}
        className="w-[920px] max-w-[95vw] h-[600px] max-h-[85vh] bg-surface-primary rounded-2xl shadow-2xl border border-line flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line-light bg-surface-secondary-soft">
          <div className="flex items-center gap-2.5">
            <Sigma className="w-4.5 h-4.5 text-ink-secondary" />
            <h2 className="text-sm font-semibold text-ink-strong">Edit formula</h2>
            <span className="text-xs text-ink-muted">— {property.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 rounded-md text-ink-muted hover:text-hover-text hover:bg-hover-surface2 transition-colors" title="Formula help">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:text-hover-text hover:bg-hover-surface2 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: 3-column layout */}
        <div className="flex flex-1 min-h-0">
          <Sidebar sidebarSearch={sidebarSearch} onSearchChange={setSidebarSearch}
            filteredProperties={filteredProperties} filteredFunctions={filteredFunctions}
            expandedCategories={expandedCategories} toggleCategory={toggleCategory}
            insertProperty={insertProperty} insertFunction={insertFunction} onSelectItem={setSelectedItem} />

          {/* Main editor area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* AI prompt bar */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-secondary rounded-lg border border-line focus-within:border-focus-border focus-within:ring-1 focus-within:ring-focus-ring transition-all">
                <Sigma className="w-4 h-4 text-ink-muted shrink-0" />
                <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-placeholder"
                  placeholder="Write, fix, or explain a formula…"
                  onKeyDown={e => { if (e.key === 'Enter' && aiPrompt.trim()) { setExpression(aiPrompt.trim()); setAiPrompt(''); } }} />
                <button onClick={() => { if (aiPrompt.trim()) { setExpression(aiPrompt.trim()); setAiPrompt(''); } }}
                  className={`p-1 rounded-md transition-colors ${aiPrompt.trim() ? 'text-accent-text-soft hover:bg-hover-accent-soft' : 'text-ink-disabled cursor-default'}`}
                  disabled={!aiPrompt.trim()}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="flex-1 px-4 pb-2 min-h-0 flex flex-col">
              <div className="flex-1 relative rounded-lg border border-line bg-surface-primary overflow-hidden focus-within:border-focus-border focus-within:ring-1 focus-within:ring-focus-ring transition-all">
                <textarea ref={editorRef} value={expression} onChange={e => setExpression(e.target.value)}
                  className="w-full h-full resize-none p-3 text-sm font-mono text-ink leading-relaxed outline-none placeholder:text-placeholder"
                  placeholder="Your formula" spellCheck={false}
                  onKeyDown={e => {
                    if (e.key === 'Tab') { e.preventDefault(); insertAtCursor('  '); }
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveFormula(); }
                  }} />
              </div>
            </div>

            {/* Preview section */}
            <div className="px-4 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Preview with</span>
                  <select value={previewPageId || ''} onChange={e => setPreviewPageId(e.target.value)}
                    className="text-xs px-2 py-1 bg-surface-secondary border border-line rounded-md outline-none focus:border-focus-border max-w-[200px] truncate text-ink-body">
                    {previewPages.map(page => <option key={page.id} value={page.id}>{getPageTitle(page)}</option>)}
                  </select>
                </div>
                <button onClick={() => setDebugMode(!debugMode)}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${debugMode ? 'bg-amber-surface text-amber-text-bold border border-amber-border' : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface'}`}>
                  <Bug className="w-3 h-3" /> Debug
                </button>
              </div>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${previewResult.error ? 'bg-danger-surface-soft border-danger-border' : expression.trim() ? 'bg-surface-secondary border-line' : 'bg-surface-secondary-soft border-line-light'}`}>
                <div className="flex-1 min-w-0">
                  {expression.trim() ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono truncate ${previewResult.error ? 'text-danger-text-soft' : 'text-ink'}`}>
                        {previewResult.value != null ? String(previewResult.value) : <span className="text-ink-muted italic">Empty</span>}
                      </span>
                      {previewResult.type && getReturnTypeBadge(previewResult.type)}
                    </div>
                  ) : <span className="text-xs text-ink-muted italic">Enter a formula to see preview</span>}
                </div>
              </div>
              {debugMode && expression.trim() && (
                <div className="p-2.5 rounded-lg bg-surface-inverse text-[11px] font-mono text-ink-disabled space-y-1 max-h-[100px] overflow-y-auto">
                  <div><span className="text-ink-secondary">expression:</span> {expression}</div>
                  <div><span className="text-ink-secondary">resolved:</span> {(() => {
                    try {
                      if (!previewPageId || !storePages[previewPageId]) return '(no page)';
                      const page = storePages[previewPageId];
                      return expression.replace(/prop\("([^"]+)"\)/g, (_m, pName) => {
                        const schemaProp = Object.values(db.properties).find(p => p.name === pName);
                        if (!schemaProp) return `<unknown:${pName}>`;
                        return JSON.stringify(page.properties[schemaProp.id]);
                      });
                    } catch { return '(resolve error)'; }
                  })()}</div>
                  <div><span className="text-ink-secondary">result:</span> <span className={previewResult.error ? 'text-danger-text-faint' : 'text-success-text-faint'}>{JSON.stringify(previewResult.value)}</span></div>
                  <div><span className="text-ink-secondary">type:</span> {previewResult.type || '—'}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-line-light bg-surface-secondary-soft">
              <span className="text-[11px] text-ink-muted">
                <kbd className="px-1 py-0.5 bg-surface-muted-soft2 rounded text-[10px] font-mono">⌘ Enter</kbd> to save
              </span>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-3 py-1.5 text-xs text-ink-body-light hover:text-hover-text-bolder hover:bg-hover-surface2 rounded-md transition-colors">Cancel</button>
                <button onClick={saveFormula} className="px-4 py-1.5 text-xs font-medium text-ink-inverse bg-accent hover:bg-hover-accent rounded-md transition-colors shadow-sm">Done</button>
              </div>
            </div>
          </div>

          <DocPanel selectedItem={selectedItem} insertAtCursor={insertAtCursor} />
        </div>
      </div>
    </div>,
    document.body
  );
}
