/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   blockEditorKeyHandlers.ts                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { Block } from '../types/database';
import { continuesWithSameTypeOnEnter, isEffectivelyEmpty, isTodoType } from './blockTypeGuards';

export interface SlashMenuState {
  blockId: string;
  position: { x: number; y: number };
  filter: string;
}

export function handleEnterKey(
  e: React.KeyboardEvent, blockId: string, blockType: Block['type'], slashMenu: SlashMenuState | null,
  pageId: string, insertBlock: (pid: string, bid: string, b: Block) => void,
  focusBlock: (id: string, end?: boolean) => void,
): void {
  if (slashMenu) return;
  e.preventDefault();
  const nextType = continuesWithSameTypeOnEnter(blockType) ? blockType : 'paragraph';
  const newBlock: Block = { id: crypto.randomUUID(), type: nextType, content: '' };
  insertBlock(pageId, blockId, newBlock);
  focusBlock(newBlock.id);
}

export function handleEmptyTodoEnter(
  e: React.KeyboardEvent,
  block: Block,
  liveText: string,
  pageId: string,
  changeBlockType: (pid: string, bid: string, type: Block['type']) => void,
  updateBlock: (pid: string, bid: string, updates: Partial<Block>) => void,
  focusBlock: (id: string, end?: boolean) => void,
): boolean {
  if (e.key !== 'Enter' || e.shiftKey || !isTodoType(block.type) || !isEffectivelyEmpty(liveText)) {
    return false;
  }

  e.preventDefault();
  changeBlockType(pageId, block.id, 'paragraph');
  updateBlock(pageId, block.id, { content: '', checked: false });
  focusBlock(block.id);
  return true;
}

export function handleBackspaceKey(
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

export function handleArrowUp(blockId: string, content: Block[], focusBlock: (id: string, end?: boolean) => void): boolean {
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

export function handleArrowDown(blockId: string, content: Block[], el: HTMLElement, focusBlock: (id: string, end?: boolean) => void): boolean {
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
