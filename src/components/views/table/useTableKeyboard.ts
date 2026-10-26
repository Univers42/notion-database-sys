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
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { SchemaProperty, Page, DatabaseSchema } from '../../../types/database';
import {
  type CellCoord,
  type CellRange,
  directionForKey,
  isGridEntryKey,
  nextFocusedCell,
  typeToEditSeed,
  type EditingCell,
} from './gridKeyboard';
import { planClear } from './gridClipboard';
import { applyCellWrites } from './useGridClipboard';

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

interface KeyboardDeps {
  focusedCell: CellCoord | null;
  editingCell: EditingCell | null;
  setFocusedCell: (c: CellCoord | null) => void;
  setEditingCell: (c: EditingCell | null) => void;
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
  /** Shift+F10 / ContextMenu: the row menu, anchored at the selected cell. */
  onRowMenu: (pageId: string, x: number, y: number) => void;
  /** Ctrl/Cmd+Enter: open the selected record. */
  onOpenPage: (pageId: string) => void;
  /** Fixed corner of a multi-cell selection; Shift+arrows move the other corner. */
  selectionAnchor: CellCoord | null;
  setSelectionAnchor: React.Dispatch<React.SetStateAction<CellCoord | null>>;
  /** The selected cells (the focused cell alone when there is no anchor). */
  selectionRange: CellRange | null;
}

/** Handles grid navigation (arrows, Tab, Home/End, PageUp/Down; Shift extends
 *  the selection), cell activation (Enter/Space), clearing the selection
 *  (Delete), and the Escape steps: collapse the selection, then leave the grid. */
export function useTableKeyboard(deps: KeyboardDeps) {
  const {
    focusedCell, editingCell, setFocusedCell, setEditingCell,
    displayedPages, visibleProps, database, tableRef,
    onActivateCell, onExitGrid, scrollToIndex, onRowMenu, onOpenPage,
    selectionAnchor, setSelectionAnchor, selectionRange,
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

    // Header and footer controls (column menus, resize handles, calculations)
    // own their keys: claiming Enter here cancelled their native click
    // whenever a cell was selected.
    if ((e.target as HTMLElement).closest('thead, tfoot')) { e.stopPropagation(); return; }
    // A portaled menu (row options) bubbles through this handler in the React
    // tree; claiming its arrows moved the cell and pulled focus out of the menu.
    // Cell editors still route here: their Escape/Tab close the edit.
    if (!editingCell && !e.currentTarget.contains(e.target as Node)) return;

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
      const next = nextFocusedCell(dir, focusedCell, displayedPages, visibleProps, PAGE_STEP);
      // Tab past the first/last column leaves the grid, so keyboard users are
      // never trapped in it.
      if (e.key === 'Tab' && !next) return;
      own();
      if (next) {
        // Shift+Tab is a move, not an extend.
        if (e.shiftKey && e.key !== 'Tab') setSelectionAnchor(anchor => anchor ?? focusedCell);
        else setSelectionAnchor(null);
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

    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
      own();
      const anchor = document.getElementById(tableRef.current?.getAttribute('aria-activedescendant') ?? '');
      const r = anchor?.getBoundingClientRect();
      onRowMenu(focusedCell.pageId, r?.left ?? 0, r?.bottom ?? 0);
      return;
    }

    switch (e.key) {
      case 'Enter':
        own();
        if (e.shiftKey) storeApi.getState().addPage(database.id);
        else if (e.ctrlKey || e.metaKey) onOpenPage(focusedCell.pageId);
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
        if (selectionAnchor) setSelectionAnchor(null);
        else onExitGrid();
        break;
      case 'Delete':
      case 'Backspace':
        // Claim it so Backspace/Delete clears the cells — not the host editor
        // deleting the whole database block.
        own();
        if (selectionRange) applyCellWrites(storeApi, planClear(selectionRange, displayedPages, visibleProps));
        break;
      default: {
        const type = database.properties[focusedCell.propId]?.type ?? '';
        const seed = e.nativeEvent.isComposing ? null : typeToEditSeed(e, type);
        if (seed !== null) {
          own();
          setEditingCell({ ...focusedCell, seed });
        }
      }
    }
  }, [
    focusedCell, editingCell, setFocusedCell, setEditingCell,
    displayedPages, visibleProps, database, tableRef,
    onActivateCell, onExitGrid, storeApi, scrollToIndex, onRowMenu, onOpenPage,
    selectionAnchor, setSelectionAnchor, selectionRange,
  ]);
}
