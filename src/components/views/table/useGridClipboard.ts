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

import React, { useCallback } from 'react';
import type { DatabaseStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import type { Page, SchemaProperty } from '../../../types/database';
import type { CellCoord, CellRange } from './gridKeyboard';
import { copyRange, parseTsv, planClear, planPaste, type CellWrite } from './gridClipboard';

interface GridClipboardDeps {
  editingCell: CellCoord | null;
  selectionRange: CellRange | null;
  displayedPages: Page[];
  visibleProps: SchemaProperty[];
  storeApi: DatabaseStoreApi;
}

/** The range the grid copies or pastes into, or null to leave the event to
 *  the browser: an open cell editor or a popover input (portals bubble
 *  through the grid) keeps its own text copy and paste. */
function clipboardRange(e: React.ClipboardEvent, editingCell: CellCoord | null, range: CellRange | null): CellRange | null {
  const target = e.target;
  const inText = target instanceof HTMLElement
    && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
  return editingCell || inText ? null : range;
}

export function applyCellWrites(storeApi: DatabaseStoreApi, writes: CellWrite[]): void {
  const { updatePageProperty } = storeApi.getState();
  for (const write of writes) updatePageProperty(write.pageId, write.propId, write.value);
}

/** Copy, cut and paste of the selected cell range as spreadsheet text. */
export function useGridClipboard(deps: GridClipboardDeps) {
  const { editingCell, selectionRange, displayedPages, visibleProps, storeApi } = deps;
  const titleOf = useCallback((pageId: string) => {
    const { pages, databases } = storeApi.getState();
    const page = pages[pageId];
    const titleProp = page ? databases[page.databaseId]?.titlePropertyId : undefined;
    return titleProp ? String(page.properties[titleProp] ?? '') : '';
  }, [storeApi]);

  const onCopy = useCallback((e: React.ClipboardEvent) => {
    const range = clipboardRange(e, editingCell, selectionRange);
    if (!range) return;
    e.preventDefault();
    e.stopPropagation();
    e.clipboardData.setData('text/plain', copyRange(range, displayedPages, visibleProps, titleOf));
  }, [editingCell, selectionRange, displayedPages, visibleProps, titleOf]);

  const onCut = useCallback((e: React.ClipboardEvent) => {
    const range = clipboardRange(e, editingCell, selectionRange);
    if (!range) return;
    onCopy(e);
    applyCellWrites(storeApi, planClear(range, displayedPages, visibleProps));
  }, [editingCell, selectionRange, displayedPages, visibleProps, onCopy, storeApi]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const range = clipboardRange(e, editingCell, selectionRange);
    if (!range) return;
    e.preventDefault();
    e.stopPropagation();
    const text = e.clipboardData.getData('text/plain');
    if (text) applyCellWrites(storeApi, planPaste(parseTsv(text), range, displayedPages, visibleProps));
  }, [editingCell, selectionRange, displayedPages, visibleProps, storeApi]);

  return { onCopy, onCut, onPaste };
}
