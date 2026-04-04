/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   usePlaygroundBlockEditor.ts                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:28:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useCallback } from 'react';
import { usePageStore } from '../store/usePageStore';
import { detectBlockType } from '@src/lib/markdown';
import { useSlashSelect, repositionCursor } from '@src/hooks/useSlashSelect';
import type { Block } from '@src/types/database';

interface SlashMenuState {
  blockId: string;
  position: { x: number; y: number };
  filter: string;
}

function handleArrowUp(blockId: string, content: Block[], focusBlock: (id: string, end?: boolean) => void): boolean {
  const idx = content.findIndex(b => b.id === blockId);
  if (idx <= 0) return false;
  const sel = globalThis.getSelection();
  const range = sel?.getRangeAt(0);
  if (range?.startOffset === 0 && range.collapsed) {
    focusBlock(content[idx - 1].id, true);
    return true;
  }
  return false;
}

function handleArrowDown(
  blockId: string, content: Block[], el: HTMLElement, focusBlock: (id: string, end?: boolean) => void,
): boolean {
  const idx = content.findIndex(b => b.id === blockId);
  if (idx >= content.length - 1) return false;
  const sel = globalThis.getSelection();
  const range = sel?.getRangeAt(0);
  if (range?.endOffset === (el.textContent?.length ?? 0) && range.collapsed) {
    focusBlock(content[idx + 1].id);
    return true;
  }
  return false;
}

function handleEnterKey(
  e: React.KeyboardEvent, blockId: string, slashMenu: SlashMenuState | null,
  pageId: string, insertBlock: (pid: string, bid: string, b: Block) => void,
  focusBlock: (id: string, end?: boolean) => void,
): void {
  if (slashMenu) return;
  e.preventDefault();
  const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
  insertBlock(pageId, blockId, newBlock);
  focusBlock(newBlock.id);
}

function handleBackspaceKey(
  e: React.KeyboardEvent, blockId: string, content: Block[],
  pageId: string, deleteBlock: (pid: string, bid: string) => void,
  focusBlock: (id: string, end?: boolean) => void,
): void {
  e.preventDefault();
  const idx = content.findIndex(b => b.id === blockId);
  const prevBlockId = idx > 0 ? content[idx - 1].id : null;
  deleteBlock(pageId, blockId);
  if (prevBlockId) focusBlock(prevBlockId, true);
}

/** Manages block editing, slash commands, and keyboard navigation for playground pages. */
export function usePlaygroundBlockEditor(pageId: string) {
  const {
    updatePageContent,
    insertBlock,
    deleteBlock,
    changeBlockType,
    updateBlock,
  } = usePageStore.getState();

  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());

  /** Focus a block element after a short delay. */
  const focusBlock = useCallback((blockId: string, cursorEnd = false) => {
    setTimeout(() => {
      const el = blockRefs.current.get(blockId)
        ?? document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
      if (!el) return;
      const editable = (el.querySelector('[contenteditable]') as HTMLElement) ?? el;
      editable.focus();
      if (cursorEnd && editable.childNodes.length) {
        const sel = globalThis.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editable);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 30);
  }, []);

  /** Get the bounding rect of the caret. */
  const getCaretRect = useCallback((): { x: number; y: number } => {
    const sel = globalThis.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.x !== 0 || rect.y !== 0) return { x: rect.x, y: rect.bottom };
    }
    return { x: 100, y: 300 };
  }, []);

  /** Handle content change — detects '/' trigger and markdown shortcuts. */
  const handleBlockChange = useCallback((blockId: string, text: string, _content: Block[]) => {
    // Always persist the content first
    updateBlock(pageId, blockId, { content: text });

    // Slash menu trigger: opened when '/' is typed
    if (text.endsWith('/') && !slashMenu) {
      const pos = getCaretRect();
      setSlashMenu({ blockId, position: pos, filter: '' });
      return;
    }

    // Slash menu is open: update filter based on text after last '/'
    if (slashMenu?.blockId === blockId) {
      const slashIdx = text.lastIndexOf('/');
      if (slashIdx >= 0) {
        setSlashMenu(prev => prev ? { ...prev, filter: text.slice(slashIdx + 1) } : null);
      } else {
        // User deleted the slash — close the menu
        setSlashMenu(null);
      }
      return;
    }

    // Markdown shortcut detection (only triggers when space is typed after prefix)
    if (text.endsWith(' ') || text === '---' || text === '```') {
      const detection = detectBlockType(text);
      if (detection) {
        changeBlockType(pageId, blockId, detection.type);
        updateBlock(pageId, blockId, { content: detection.remainingContent });
        repositionCursor(blockId, detection.remainingContent);
      }
    }
  }, [pageId, slashMenu, changeBlockType, updateBlock, getCaretRect]);

  /** Handle key presses — Enter, Backspace, Arrow navigation. */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string, content: Block[]) => {
    const block = content.find(b => b.id === blockId);
    if (!block) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      handleEnterKey(e, blockId, slashMenu, pageId, insertBlock, focusBlock);
      return;
    }

    if (e.key === 'Backspace' && block.content === '' && content.length > 1) {
      handleBackspaceKey(e, blockId, content, pageId, deleteBlock, focusBlock);
      return;
    }

    if (e.key === 'ArrowUp') {
      if (handleArrowUp(blockId, content, focusBlock)) e.preventDefault();
      return;
    }

    if (e.key === 'ArrowDown') {
      if (handleArrowDown(blockId, content, e.target as HTMLElement, focusBlock)) e.preventDefault();
      return;
    }

    if (e.key === 'Escape' && slashMenu) {
      setSlashMenu(null);
    }
  }, [pageId, slashMenu, insertBlock, deleteBlock, focusBlock]);

  /** Stub createInlineDatabase for the playground (no real DB engine). */
  const createInlineDatabase = useCallback((_name?: string) => {
    return { databaseId: `local-db-${Date.now().toString(36)}`, viewId: `local-view-${Date.now().toString(36)}` };
  }, []);

  /** Handle slash-command selection. */
  const handleSlashSelect = useSlashSelect({
    pageId, slashMenu, setSlashMenu,
    updateBlock, changeBlockType, insertBlock, createInlineDatabase, focusBlock,
  });

  /** Add a new blank paragraph at the end. */
  const handleAddBlock = useCallback((content: Block[]) => {
    const lastId = content.length > 0 ? content.at(-1)!.id : null; // NOSONAR
    const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
    if (lastId) {
      insertBlock(pageId, lastId, newBlock);
    } else {
      updatePageContent(pageId, [newBlock]);
    }
    focusBlock(newBlock.id);
  }, [pageId, insertBlock, updatePageContent, focusBlock]);

  /** Initialize the first block when focusing the empty area. */
  const handleInitBlock = useCallback((content: Block[]) => {
    if (content.length === 0) {
      const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
      updatePageContent(pageId, [newBlock]);
      focusBlock(newBlock.id);
    }
  }, [pageId, updatePageContent, focusBlock]);

  /** Register or unregister a block ref. */
  const registerBlockRef = useCallback((blockId: string, el: HTMLElement | null) => {
    if (el) blockRefs.current.set(blockId, el);
    else blockRefs.current.delete(blockId);
  }, []);

  return {
    slashMenu,
    setSlashMenu,
    handleBlockChange,
    handleKeyDown,
    handleSlashSelect,
    handleAddBlock,
    handleInitBlock,
    registerBlockRef,
    focusBlock,
  };
}
