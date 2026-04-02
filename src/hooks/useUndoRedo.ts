/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useUndoRedo.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:40:21 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 15:07:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// useUndoRedo — undo/redo history for page block content
// ═══════════════════════════════════════════════════════════════════════════════
// Captures page content snapshots on each mutation through a subscription
// to the Zustand store, then provides undo() and redo() with Ctrl+Z / Ctrl+Shift+Z.
//
// Strategy: snapshot the page's Block[] after each store update (debounced to
// 300ms to batch rapid typing). On undo/redo, directly replace page content.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import type { Block } from '../types/database';

const MAX_HISTORY = 100;

interface HistoryEntry {
  content: Block[];
  timestamp: number;
}

export function useUndoRedo(pageId: string) {
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const isProgrammatic = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSnapshotRef = useRef<string>('');

  /** Take a snapshot of the current page content. */
  const snapshot = useCallback(() => {
    const page = useDatabaseStore.getState().pages[pageId];
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
  }, [pageId]);

  /** Subscribe to store changes and auto-snapshot with debounce. */
  useEffect(() => {
    // Take initial snapshot
    snapshot();

    const unsub = useDatabaseStore.subscribe((state, prev) => {
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
  }, [pageId, snapshot]);

  /** Undo: pop from undoStack, push current to redoStack, restore. */
  const undo = useCallback(() => {
    if (undoStack.current.length <= 1) return; // Need at least one entry to go back

    const page = useDatabaseStore.getState().pages[pageId];
    if (!page) return;

    // Save current state to redo stack
    redoStack.current.push({
      content: structuredClone(page.content || []),
      timestamp: Date.now(),
    });

    // Pop the current snapshot (it matches current state)
    undoStack.current.pop();
    // Get the previous snapshot
    const prev = undoStack.current[undoStack.current.length - 1];
    if (!prev) return;

    isProgrammatic.current = true;
    useDatabaseStore.getState().updatePageContent(pageId, prev.content);
    lastSnapshotRef.current = JSON.stringify(prev.content);
    isProgrammatic.current = false;
  }, [pageId]);

  /** Redo: pop from redoStack, push current to undoStack, restore. */
  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;

    const entry = redoStack.current.pop()!;

    isProgrammatic.current = true;
    undoStack.current.push({
      content: structuredClone(entry.content),
      timestamp: Date.now(),
    });
    useDatabaseStore.getState().updatePageContent(pageId, entry.content);
    lastSnapshotRef.current = JSON.stringify(entry.content);
    isProgrammatic.current = false;
  }, [pageId]);

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
