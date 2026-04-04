/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   playgroundBlockEditor.helpers.ts                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { Block } from '@src/types/database';

export interface SlashMenuState {
  blockId: string;
  position: { x: number; y: number };
  filter: string;
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

export function handleArrowDown(
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

export function handleEnterKey(
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
