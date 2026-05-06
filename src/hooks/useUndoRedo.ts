/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useUndoRedo.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:40:21 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useEffect, useRef, useCallback } from 'react';
import { useStoreApi } from '../store/dbms/hardcoded/useDatabaseStore';
import type { Block } from '../types/database';

const MAX_HISTORY = 100;

interface HistoryEntry {
  content: Block[];
  timestamp: number;
}

/**
 * Provides undo/redo history for page block content.
 *
 * Subscribes to the Zustand store and snapshots the page's `Block[]`
 * after each mutation (debounced 300ms to batch rapid typing). Binds
 * Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y keyboard shortcuts. Max 100 entries.
 *
 * @param pageId - The page to track.
 * @returns `{ undo, redo, canUndo, canRedo }`
 */
export function useUndoRedo(pageId: string) {
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const isProgrammatic = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSnapshotRef = useRef<string>('');
  const storeApi = useStoreApi();

  /** Take a snapshot of the current page content. */
  const snapshot = useCallback(() => {
    const page = storeApi.getState().pages[pageId];
    if (!page?.content) return;

    const serialized = JSON.stringify(page.content);
    if (serialized === lastSnapshotRef.current) return;

    lastSnapshotRef.current = serialized;
    undoStack.current.push({
      content: structuredClone(page.content),
      timestamp: Date.now(),
    });

    // Trim oldest entries beyond limit
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current = undoStack.current.slice(-MAX_HISTORY);
    }

    // Any new edit clears the redo stack
    if (!isProgrammatic.current) {
      redoStack.current = [];
    }
  }, [pageId, storeApi]);

  /** Subscribe to store changes and auto-snapshot with debounce. */
  useEffect(() => {
    // Take initial snapshot
    snapshot();

    const unsub = storeApi.subscribe((state, prev) => {
      if (isProgrammatic.current) return;
      const currPage = state.pages[pageId];
      const prevPage = prev.pages[pageId];
      if (!currPage || currPage.content === prevPage?.content) return;

      // Debounce rapid changes (typing)
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        snapshot();
      }, 300);
    });

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pageId, snapshot, storeApi]);

  /** Undo: pop from undoStack, push current to redoStack, restore. */
  const undo = useCallback(() => {
    if (undoStack.current.length <= 1) return; // Need at least one entry to go back

    const page = storeApi.getState().pages[pageId];
    if (!page) return;

    // Save current state to redo stack
    redoStack.current.push({
      content: structuredClone(page.content || []),
      timestamp: Date.now(),
    });

    // Pop the current snapshot (it matches current state)
    undoStack.current.pop();
    // Get the previous snapshot
    const prev = undoStack.current.at(-1);
    if (!prev) return;

    isProgrammatic.current = true;
    storeApi.getState().updatePageContent(pageId, prev.content);
    lastSnapshotRef.current = JSON.stringify(prev.content);
    isProgrammatic.current = false;
  }, [pageId, storeApi]);

  /** Redo: pop from redoStack, push current to undoStack, restore. */
  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;

    const entry = redoStack.current.pop();
    if (!entry) return;

    isProgrammatic.current = true;
    undoStack.current.push({
      content: structuredClone(entry.content),
      timestamp: Date.now(),
    });
    storeApi.getState().updatePageContent(pageId, entry.content);
    lastSnapshotRef.current = JSON.stringify(entry.content);
    isProgrammatic.current = false;
  }, [pageId, storeApi]);

  /** Global keyboard shortcut handler. */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if a block editor element is focused or the page editor area
      const target = e.target as HTMLElement;
      if (!target.closest('[data-block-editor], [data-page-content-editor]')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    undo,
    redo,
    canUndo: undoStack.current.length > 1,
    canRedo: redoStack.current.length > 0,
  };
}
