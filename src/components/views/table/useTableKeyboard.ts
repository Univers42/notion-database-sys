/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useTableKeyboard.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:59 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:45:58 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback } from 'react';
import { useStoreApi, type DatabaseStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { SchemaProperty, Page, DatabaseSchema } from '../../../types/database';

const CLEAR_VALUE_BY_TYPE: Record<string, unknown> = {
  checkbox: false,
  multi_select: [],
};

const READ_ONLY_TYPES = new Set(['title', 'id', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by']);

function handleEditingKeys(
  e: React.KeyboardEvent,
  ci: number,
  focusedCell: { pageId: string; propId: string },
  setEditingCell: (c: { pageId: string; propId: string } | null) => void,
  setFocusedCell: (c: { pageId: string; propId: string } | null) => void,
  visibleProps: SchemaProperty[],
  tableRef: React.RefObject<HTMLDivElement | null>,
): void {
  if (e.key === 'Escape') { setEditingCell(null); tableRef.current?.focus(); }
  if (e.key === 'Tab') {
    e.preventDefault();
    setEditingCell(null);
    const nextCI = e.shiftKey ? Math.max(0, ci - 1) : Math.min(visibleProps.length - 1, ci + 1);
    setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[nextCI].id });
  }
}

function handleDeleteKey(
  focusedCell: { pageId: string; propId: string },
  database: DatabaseSchema,
  storeApi: DatabaseStoreApi,
): void {
  const prop = database.properties[focusedCell.propId];
  if (prop && !READ_ONLY_TYPES.has(prop.type)) {
    const clearVal = CLEAR_VALUE_BY_TYPE[prop.type] ?? '';
    storeApi.getState().updatePageProperty(focusedCell.pageId, focusedCell.propId, clearVal);
  }
}

interface KeyboardDeps {
  focusedCell: { pageId: string; propId: string } | null;
  editingCell: { pageId: string; propId: string } | null;
  setFocusedCell: (c: { pageId: string; propId: string } | null) => void;
  setEditingCell: (c: { pageId: string; propId: string } | null) => void;
  displayedPages: Page[];
  visibleProps: SchemaProperty[];
  database: DatabaseSchema | null;
  tableRef: React.RefObject<HTMLDivElement | null>;
}

function handleNavigationKey(
  key: string, pi: number, ci: number,
  focusedCell: { pageId: string; propId: string },
  setFocusedCell: (c: { pageId: string; propId: string } | null) => void,
  displayedPages: Page[],
  visibleProps: SchemaProperty[],
): boolean {
  switch (key) {
    case 'ArrowUp': if (pi > 0) setFocusedCell({ pageId: displayedPages[pi - 1].id, propId: focusedCell.propId }); return true;
    case 'ArrowDown': if (pi < displayedPages.length - 1) setFocusedCell({ pageId: displayedPages[pi + 1].id, propId: focusedCell.propId }); return true;
    case 'ArrowLeft': if (ci > 0) setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[ci - 1].id }); return true;
    case 'ArrowRight': if (ci < visibleProps.length - 1) setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[ci + 1].id }); return true;
    default: return false;
  }
}

/** Handles keyboard navigation (arrows, Tab) and cell editing shortcuts (Enter, Delete). */
export function useTableKeyboard(deps: KeyboardDeps) {
  const { focusedCell, editingCell, setFocusedCell, setEditingCell, displayedPages, visibleProps, database, tableRef } = deps;
  const storeApi = useStoreApi();

  return useCallback((e: React.KeyboardEvent) => {
    if (!focusedCell || !database) return;
    const pi = displayedPages.findIndex(p => p.id === focusedCell.pageId);
    const ci = visibleProps.findIndex(p => p.id === focusedCell.propId);

    if (editingCell) {
      handleEditingKeys(e, ci, focusedCell, setEditingCell, setFocusedCell, visibleProps, tableRef);
      return;
    }

    if (handleNavigationKey(e.key, pi, ci, focusedCell, setFocusedCell, displayedPages, visibleProps)) {
      e.preventDefault();
      return;
    }

    switch (e.key) {
      case 'Enter':
        if (e.shiftKey) storeApi.getState().addPage(database.id);
        else setEditingCell(focusedCell);
        e.preventDefault();
        break;
      case 'Tab': {
        e.preventDefault();
        const nextCI = e.shiftKey ? Math.max(0, ci - 1) : Math.min(visibleProps.length - 1, ci + 1);
        setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[nextCI].id });
        break;
      }
      case 'Delete':
      case 'Backspace':
        handleDeleteKey(focusedCell, database, storeApi);
        break;
    }
  }, [focusedCell, editingCell, setFocusedCell, setEditingCell, displayedPages, visibleProps, database, tableRef, storeApi]);
}
