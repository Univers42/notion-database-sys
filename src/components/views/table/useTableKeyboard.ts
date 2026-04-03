/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useTableKeyboard.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:59 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { SchemaProperty, Page, DatabaseSchema } from '../../../types/database';

const CLEAR_VALUE_BY_TYPE: Record<string, unknown> = {
  checkbox: false,
  multi_select: [],
};

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

/** Handles keyboard navigation (arrows, Tab) and cell editing shortcuts (Enter, Delete). */
export function useTableKeyboard(deps: KeyboardDeps) {
  const { focusedCell, editingCell, setFocusedCell, setEditingCell, displayedPages, visibleProps, database, tableRef } = deps;

  return useCallback((e: React.KeyboardEvent) => {
    if (!focusedCell || !database) return;
    const pi = displayedPages.findIndex(p => p.id === focusedCell.pageId);
    const ci = visibleProps.findIndex(p => p.id === focusedCell.propId);

    if (editingCell) {
      if (e.key === 'Escape') { setEditingCell(null); tableRef.current?.focus(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        setEditingCell(null);
        const nextCI = e.shiftKey ? Math.max(0, ci - 1) : Math.min(visibleProps.length - 1, ci + 1);
        setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[nextCI].id });
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':    if (pi > 0) setFocusedCell({ pageId: displayedPages[pi - 1].id, propId: focusedCell.propId }); e.preventDefault(); break;
      case 'ArrowDown':  if (pi < displayedPages.length - 1) setFocusedCell({ pageId: displayedPages[pi + 1].id, propId: focusedCell.propId }); e.preventDefault(); break;
      case 'ArrowLeft':  if (ci > 0) setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[ci - 1].id }); e.preventDefault(); break;
      case 'ArrowRight': if (ci < visibleProps.length - 1) setFocusedCell({ pageId: focusedCell.pageId, propId: visibleProps[ci + 1].id }); e.preventDefault(); break;
      case 'Enter':
        if (e.shiftKey) useDatabaseStore.getState().addPage(database.id);
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
      case 'Backspace': {
        const prop = database.properties[focusedCell.propId];
        const readOnlyTypes = new Set(['title', 'id', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by']);
        if (prop && !readOnlyTypes.has(prop.type)) {
          const clearVal = CLEAR_VALUE_BY_TYPE[prop.type] ?? '';
          useDatabaseStore.getState().updatePageProperty(focusedCell.pageId, focusedCell.propId, clearVal);
        }
        break;
      }
    }
  }, [focusedCell, editingCell, setFocusedCell, setEditingCell, displayedPages, visibleProps, database, tableRef]);
}
