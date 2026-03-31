/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFormulaEditorPanel.ts                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:22 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 19:40:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import type { SchemaProperty, Page } from '../types/database';
import { FORMULA_FUNCTIONS, FUNCTION_CATEGORIES } from './formulaEditor';
import type { FunctionDef } from './formulaEditor';

export function useFormulaEditorPanel(databaseId: string, propertyId: string, onClose: () => void) {
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

  return {
    db, property, expression, setExpression, aiPrompt, setAiPrompt,
    debugMode, setDebugMode, selectedItem, setSelectedItem,
    sidebarSearch, setSidebarSearch, expandedCategories, toggleCategory,
    previewPageId, setPreviewPageId, editorRef, panelRef,
    previewPages, filteredProperties, filteredFunctions, previewResult,
    insertAtCursor, insertProperty, insertFunction, saveFormula, getPageTitle,
    storePages,
  };
}
