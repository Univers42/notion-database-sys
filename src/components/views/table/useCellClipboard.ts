// ─── useCellClipboard — Ctrl+C / Ctrl+X / Ctrl+V on the selected cell ────────
// Native copy/cut/paste events carry clipboardData without a permission prompt,
// but Chrome fires no paste on the grid itself (it is not editable). So the
// shortcut's keydown moves focus to a hidden textarea sink inside the grid,
// the browser runs the command there, and focus returns to the grid on the
// next task. While a cell editor is open the input owns the clipboard.
// Caveat: only the keyboard shortcut is caught — the browser's Edit menu and
// context-menu Paste run against the grid div, where Chrome fires no paste.

import React, { useCallback, useRef } from 'react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import type { DatabaseSchema, Page, SchemaProperty } from '../../../types/database';
import { cellCopyText, parseClipboardGrid, planPaste } from './cellClipboard';
import { clearValueFor, isClearableType, type CellCoord, type EditingCell } from './gridKeyboard';

const CLIPBOARD_KEYS = new Set(['c', 'x', 'v']);

interface ClipboardDeps {
  focusedCell: CellCoord | null;
  editingCell: EditingCell | null;
  rowPages: readonly Page[];
  visibleProps: readonly SchemaProperty[];
  database: DatabaseSchema | null;
}

export function useCellClipboard({ focusedCell, editingCell, rowPages, visibleProps, database }: ClipboardDeps) {
  const storeApi = useStoreApi();
  const sinkRef = useRef<HTMLTextAreaElement>(null);

  const selected = useCallback(() => {
    if (editingCell || !focusedCell || !database) return null;
    const state = storeApi.getState();
    const page = state.pages[focusedCell.pageId];
    const prop = database.properties[focusedCell.propId];
    return page && prop ? { state, page, prop, anchor: focusedCell } : null;
  }, [editingCell, focusedCell, database, storeApi]);

  const onCopy = useCallback((e: React.ClipboardEvent) => {
    const cell = selected();
    if (!cell) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', cellCopyText(cell.state, cell.page, cell.prop));
  }, [selected]);

  const onCut = useCallback((e: React.ClipboardEvent) => {
    const cell = selected();
    if (!cell) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', cellCopyText(cell.state, cell.page, cell.prop));
    if (isClearableType(cell.prop.type)) cell.state.updatePageProperty(cell.page.id, cell.prop.id, clearValueFor(cell.prop.type));
  }, [selected]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const cell = selected();
    if (!cell) return;
    e.preventDefault();
    const grid = parseClipboardGrid(e.clipboardData.getData('text/plain'));
    for (const w of planPaste(grid, rowPages, visibleProps, cell.anchor)) cell.state.updatePageProperty(w.pageId, w.propId, w.value);
  }, [selected, rowPages, visibleProps]);

  const onKeyDownCapture = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || !CLIPBOARD_KEYS.has(e.key.toLowerCase())) return;
    const sink = sinkRef.current;
    if (editingCell || !focusedCell || !sink || e.target !== e.currentTarget) return;
    const grid = e.currentTarget;
    sink.focus({ preventScroll: true });
    setTimeout(() => { if (document.activeElement === sink) grid.focus({ preventScroll: true }); }, 0);
  }, [editingCell, focusedCell]);

  return { sinkRef, onKeyDownCapture, onCopy, onCut, onPaste };
}
