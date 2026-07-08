/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useTableKeyboard.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:59 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback } from 'react';
import { useStoreApi, type DatabaseStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { SchemaProperty, Page, DatabaseSchema } from '../../../types/database';
import {
  type CellCoord,
  CLEAR_VALUE_BY_TYPE,
  directionForKey,
  isClearableType,
  isGridEntryKey,
  nextFocusedCell,
} from './gridKeyboard';

/** How many rows PageUp/PageDown jump (roughly one virtualized viewport). */
const PAGE_STEP = 10;

function handleEditingKeys(
  e: React.KeyboardEvent,
  ci: number,
  focusedCell: CellCoord,
  setEditingCell: (c: CellCoord | null) => void,
  setFocusedCell: (c: CellCoord | null) => void,
  visibleProps: SchemaProperty[],
  tableRef: React.RefObject<HTMLDivElement | null>,
): void {
  // Level 2 → Level 1: Escape closes the editor and returns to the selected cell.
  // stopPropagation so Escape/Tab don't also drive the host block editor.
  if (e.key === 'Escape') { e.stopPropagation(); setEditingCell(null); tableRef.current?.focus(); }
  if (e.key === 'Tab') {
    e.preventDefault();
    e.stopPropagation();
    setEditingCell(null);
    const nextCI = e.shiftKey ? Math.max(0, ci - 1) : Math.min(visibleProps.length - 1, ci + 1);
    setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[nextCI].id });
  }
}

function handleDeleteKey(
  focusedCell: CellCoord,
  database: DatabaseSchema,
  storeApi: DatabaseStoreApi,
): void {
  const prop = database.properties[focusedCell.propId];
  if (prop && isClearableType(prop.type)) {
    const clearVal = CLEAR_VALUE_BY_TYPE[prop.type] ?? '';
    storeApi.getState().updatePageProperty(focusedCell.pageId, focusedCell.propId, clearVal);
  }
}

interface KeyboardDeps {
  focusedCell: CellCoord | null;
  editingCell: CellCoord | null;
  setFocusedCell: (c: CellCoord | null) => void;
  setEditingCell: (c: CellCoord | null) => void;
  displayedPages: Page[];
  visibleProps: SchemaProperty[];
  database: DatabaseSchema | null;
  tableRef: React.RefObject<HTMLDivElement | null>;
  /** Activate the focused cell per its type (edit / toggle / button / formula). */
  onActivateCell: (cell: CellCoord) => void;
  /** Escape from Level 1 (selected, not editing): leave the grid. */
  onExitGrid: () => void;
  /** Scroll an off-screen row into view before focus lands on it (virtualized body). */
  scrollToIndex?: (index: number) => void;
}

/** Handles grid navigation (arrows, Tab, Home/End, PageUp/Down), cell activation
 *  (Enter/Space), clearing (Delete), and the Escape-out-of-grid step. */
export function useTableKeyboard(deps: KeyboardDeps) {
  const {
    focusedCell, editingCell, setFocusedCell, setEditingCell,
    displayedPages, visibleProps, database, tableRef,
    onActivateCell, onExitGrid, scrollToIndex,
  } = deps;
  const storeApi = useStoreApi();

  return useCallback((e: React.KeyboardEvent) => {
    if (!database || visibleProps.length === 0) return;

    // Insulate the embedded grid from the host block editor. A key the grid
    // claims must NOT keep bubbling: the page's block navigation moves focus to
    // the previous/next BLOCK on ArrowUp/Down and yanks DOM focus out of the
    // grid, so every later key is dead until a click (Left/Right never cross a
    // block, which is why only vertical moves froze). stopPropagation halts that
    // React bubble handler; preventDefault halts native scroll/caret.
    const own = () => { e.preventDefault(); e.stopPropagation(); };

    // Entered the grid (focus/tab) with no cell selected: the first navigation
    // or Enter key selects the first cell — the fix for "arrows do nothing".
    if (!focusedCell) {
      const first = displayedPages[0];
      const firstProp = visibleProps[0];
      if (first && firstProp && isGridEntryKey(e.key)) {
        own();
        setFocusedCell({ pageId: first.id, propId: firstProp.id });
      }
      return;
    }

    const pi = displayedPages.findIndex(p => p.id === focusedCell.pageId);
    const ci = visibleProps.findIndex(p => p.id === focusedCell.propId);

    // Self-heal: if the selected cell fell out of the current view (its row/col
    // is gone — e.g. a virtualized re-scroll or a data change desynced it), a
    // navigation key re-anchors to the first cell instead of dead-ending. Without
    // this, nextFocusedCell would return null for every direction and the grid
    // would look frozen until the user clicked.
    if (pi < 0 || ci < 0) {
      const first = displayedPages[0];
      const firstProp = visibleProps[0];
      if (first && firstProp && isGridEntryKey(e.key)) {
        own();
        setFocusedCell({ pageId: first.id, propId: firstProp.id });
      }
      return;
    }

    if (editingCell) {
      handleEditingKeys(e, ci, focusedCell, setEditingCell, setFocusedCell, visibleProps, tableRef);
      return;
    }

    const dir = directionForKey(e);
    if (dir) {
      own();
      const next = nextFocusedCell(dir, focusedCell, displayedPages, visibleProps, PAGE_STEP);
      if (next) {
        setFocusedCell(next);
        const nextPi = displayedPages.findIndex(p => p.id === next.pageId);
        if (nextPi >= 0 && nextPi !== pi) scrollToIndex?.(nextPi);
      }
      // Anchor DOM focus on the stable grid container. If focus was sitting on a
      // row's button (drag/expand/row-options) or on a row that then scrolls out
      // and unmounts, focus would fall to <body> and every subsequent key would
      // be dead until a click. The keydown still bubbles here from a focused row
      // button, so re-claiming focus now keeps navigation alive. (No-op when the
      // container already has focus, so no focus-event churn.)
      tableRef.current?.focus({ preventScroll: true });
      return;
    }

    switch (e.key) {
      case 'Enter':
        own();
        if (e.shiftKey) storeApi.getState().addPage(database.id);
        else onActivateCell(focusedCell);
        break;
      case ' ': // Space toggles a checkbox (spreadsheet convention); else ignored.
        if (database.properties[focusedCell.propId]?.type === 'checkbox') {
          own();
          onActivateCell(focusedCell);
        }
        break;
      case 'Escape':
        own();
        onExitGrid();
        break;
      case 'Delete':
      case 'Backspace':
        // Claim it so Backspace/Delete clears the cell — not the host editor
        // deleting the whole database block.
        own();
        handleDeleteKey(focusedCell, database, storeApi);
        break;
    }
  }, [
    focusedCell, editingCell, setFocusedCell, setEditingCell,
    displayedPages, visibleProps, database, tableRef,
    onActivateCell, onExitGrid, storeApi, scrollToIndex,
  ]);
}
