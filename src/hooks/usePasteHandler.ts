/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   usePasteHandler.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:40:10 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:16:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useEffect, useCallback } from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { parseMarkdownToBlocks } from '../lib/markdown';

/** Returns true if the text contains enough markdown-like patterns to warrant parsing. */
function looksLikeMarkdown(text: string): boolean {
  // Quick heuristic: does the text contain markdown-ish patterns?
  const lines = text.split('\n');
  if (lines.length < 2) return false; // Single line — let browser handle it

  const mdPatterns = [
    /^#{1,6}\s/,          // headings
    /^[-*+]\s/,           // unordered list
    /^\d+\.\s/,           // ordered list
    /^>\s/,               // blockquote
    /^```/,               // code fence
    /^---$/,              // divider
    /^\[[ x]\]\s/i,       // check-item
  ];

  let mdLineCount = 0;
  for (const line of lines) {
    if (mdPatterns.some(p => p.test(line.trim()))) {
      mdLineCount++;
    }
  }
  // If >= 20% of lines look like markdown, parse it
  return mdLineCount >= 1 && mdLineCount / lines.length >= 0.1;
}

/**
 * Intercepts paste events in the block editor and converts markdown to blocks.
 *
 * When the user pastes text that looks like markdown (headings, lists,
 * code fences, etc.), it prevents the default paste and inserts parsed
 * `Block[]` after the currently focused block. Plain text paste is left
 * to the browser's default behavior.
 *
 * @param pageId - The page to insert pasted blocks into.
 */
export function usePasteHandler(pageId: string) {
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    // Only intercept in our block editor
    if (!target.closest('[data-page-content-editor]')) return;
    // Don't intercept if inside a code block or table
    if (target.closest('[data-block-type="code"]') || target.closest('table')) return;

    const text = e.clipboardData?.getData('text/plain');
    if (!text || !looksLikeMarkdown(text)) return;

    e.preventDefault();

    const blocks = parseMarkdownToBlocks(text);
    if (blocks.length === 0) return;

    const { pages, insertBlock, updatePageContent } = useDatabaseStore.getState();
    const page = pages[pageId];
    if (!page) return;

    const content = page.content || [];

    // Find which block is currently focused
    const focused = document.activeElement?.closest('[data-block-id]');
    const focusedId = (focused as HTMLElement)?.dataset.blockId;

    if (focusedId && content.some(b => b.id === focusedId)) {
      // Insert each new block after the current one, in order
      let afterId = focusedId;
      for (const block of blocks) {
        insertBlock(pageId, afterId, block);
        afterId = block.id;
      }
    } else {
      // No focused block — append to end
      updatePageContent(pageId, [...content, ...blocks]);
    }
  }, [pageId]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);
}
