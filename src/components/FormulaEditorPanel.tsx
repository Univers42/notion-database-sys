/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FormulaEditorPanel.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:22 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 19:40:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle, Send, Bug, Sigma } from 'lucide-react';
import { getReturnTypeBadge } from './formulaEditor';
import { Sidebar } from './formulaEditor/Sidebar';
import { DocPanel } from './formulaEditor/DocPanel';
import { useFormulaEditorPanel } from './useFormulaEditorPanel';

// ═══════════════════════════════════════════════════════════════════════════════

interface FormulaEditorPanelProps {
  databaseId: string;
  propertyId: string;
  onClose: () => void;
}

export function FormulaEditorPanel({ databaseId, propertyId, onClose }: FormulaEditorPanelProps) {
  const {
    db, property, expression, setExpression, aiPrompt, setAiPrompt,
    debugMode, setDebugMode, selectedItem, setSelectedItem,
    sidebarSearch, setSidebarSearch, expandedCategories, toggleCategory,
    previewPageId, setPreviewPageId, editorRef, panelRef,
    previewPages, filteredProperties, filteredFunctions, previewResult,
    insertAtCursor, insertProperty, insertFunction, saveFormula, getPageTitle,
    storePages,
  } = useFormulaEditorPanel(databaseId, propertyId, onClose);

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
