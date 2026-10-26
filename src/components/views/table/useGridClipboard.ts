/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useGridClipboard.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 08:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 08:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback, useRef } from 'react';
import type { DatabaseStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import type { Page, SchemaProperty } from '../../../types/database';
import type { CellCoord, CellRange } from './gridKeyboard';
import { copyRange, parseTsv, planClear, planPaste, type CellWrite } from './gridClipboard';

const CLIPBOARD_KEYS = new Set(['c', 'x', 'v']);

interface GridClipboardDeps {
  editingCell: CellCoord | null;
  focusedCell: CellCoord | null;
  selectionRange: CellRange | null;
  displayedPages: readonly Page[];
  visibleProps: readonly SchemaProperty[];
  storeApi: DatabaseStoreApi;
}

/** The range the grid copies or pastes into, or null to leave the event to
 *  the browser: an open cell editor or a popover input (portals bubble
 *  through the grid) keeps its own text copy and paste. The paste sink is a
 *  textarea, but it is the grid's own. */
function clipboardRange(e: React.ClipboardEvent, editingCell: CellCoord | null, range: CellRange | null, sink: HTMLElement | null): CellRange | null {
  const target = e.target;
  const inText = target !== sink && target instanceof HTMLElement
    && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
  return editingCell || inText ? null : range;
}

export function applyCellWrites(storeApi: DatabaseStoreApi, writes: CellWrite[]): void {
  const { updatePageProperty } = storeApi.getState();
  for (const write of writes) updatePageProperty(write.pageId, write.propId, write.value);
}

/** Copy, cut and paste of the selected cell range as spreadsheet text.
 *
 *  Caveat: Chrome fires no paste event on a focused, non-editable element, so
 *  Ctrl/Cmd+C/X/V moves focus to an off-screen textarea (`sinkRef`) for the one
 *  keystroke and hands it back on the next task. A paste started from the
 *  browser menu while the grid has focus still reaches nothing. */
export function useGridClipboard(deps: GridClipboardDeps) {
  const { editingCell, focusedCell, selectionRange, displayedPages, visibleProps, storeApi } = deps;
  const sinkRef = useRef<HTMLTextAreaElement>(null);

  const onCopy = useCallback((e: React.ClipboardEvent) => {
    const range = clipboardRange(e, editingCell, selectionRange, sinkRef.current);
    if (!range) return;
    e.preventDefault();
    e.stopPropagation();
    e.clipboardData.setData('text/plain', copyRange(range, displayedPages, visibleProps, storeApi.getState()));
  }, [editingCell, selectionRange, displayedPages, visibleProps, storeApi]);

  const onCut = useCallback((e: React.ClipboardEvent) => {
    const range = clipboardRange(e, editingCell, selectionRange, sinkRef.current);
    if (!range) return;
    onCopy(e);
    applyCellWrites(storeApi, planClear(range, displayedPages, visibleProps));
  }, [editingCell, selectionRange, displayedPages, visibleProps, onCopy, storeApi]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const range = clipboardRange(e, editingCell, selectionRange, sinkRef.current);
    if (!range) return;
    e.preventDefault();
    e.stopPropagation();
    const text = e.clipboardData.getData('text/plain');
    if (text) applyCellWrites(storeApi, planPaste(parseTsv(text), range, displayedPages, visibleProps));
  }, [editingCell, selectionRange, displayedPages, visibleProps, storeApi]);

  // Shift is allowed on V only: Ctrl+Shift+V is "paste as plain text".
  const onKeyDownCapture = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const key = e.key.toLowerCase();
    if (!(e.ctrlKey || e.metaKey) || e.altKey || (e.shiftKey && key !== 'v') || !CLIPBOARD_KEYS.has(key)) return;
    const sink = sinkRef.current;
    if (editingCell || !focusedCell || !sink || e.target !== e.currentTarget) return;
    const grid = e.currentTarget;
    sink.focus({ preventScroll: true });
    setTimeout(() => { if (document.activeElement === sink) grid.focus({ preventScroll: true }); }, 0);
  }, [editingCell, focusedCell]);

  return { sinkRef, onKeyDownCapture, onCopy, onCut, onPaste };
}
