/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   InlineToolbar.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:23 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 21:00:32 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// InlineToolbar — floating formatting toolbar on text selection
// ═══════════════════════════════════════════════════════════════════════════════
// Appears above selected text in contentEditable blocks.
// Buttons: Bold | Italic | Strikethrough | Code | Link
// Uses document.execCommand for formatting and wraps with markdown syntax.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Strikethrough, Code, Link } from 'lucide-react';
import { wrapSelection, insertLinkMarkdown, getSelectionRect, ToolbarButton } from './InlineToolbarHelpers';
import type { ToolbarPosition } from './InlineToolbarHelpers';
import { cn } from '../../utils/cn';

// ─── Main component ─────────────────────────────────────────────────────────

export function InlineToolbar() {
  const [pos, setPos] = useState<ToolbarPosition>({ x: 0, y: 0, visible: false });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const updatePosition = useCallback(() => {
    const rect = getSelectionRect();
    if (!rect) {
      // Delay hide slightly to avoid flicker during click
      hideTimeoutRef.current = setTimeout(() => {
        setPos(p => ({ ...p, visible: false }));
      }, 150);
      return;
    }
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      visible: true,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updatePosition);
    return () => {
      document.removeEventListener('selectionchange', updatePosition);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [updatePosition]);

  if (!pos.visible) return null;

  const toolbarWidth = 230;
  const left = Math.max(8, Math.min(pos.x - toolbarWidth / 2, window.innerWidth - toolbarWidth - 8));

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        left,
        top: pos.y,
        transform: 'translateY(-100%)',
        zIndex: 10000,
      }}
      className={cn("flex items-center gap-0.5 px-1 py-0.5 bg-surface-primary border border-line rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150")}
    >
      <ToolbarButton
        icon={<Bold className={cn("w-4 h-4")} />}
        label="Bold (Ctrl+B)"
        onClick={() => wrapSelection('**', '**')}
      />
      <ToolbarButton
        icon={<Italic className={cn("w-4 h-4")} />}
        label="Italic (Ctrl+I)"
        onClick={() => wrapSelection('*', '*')}
      />
      <ToolbarButton
        icon={<Strikethrough className={cn("w-4 h-4")} />}
        label="Strikethrough"
        onClick={() => wrapSelection('~~', '~~')}
      />
      <ToolbarButton
        icon={<Code className={cn("w-4 h-4")} />}
        label="Inline code"
        onClick={() => wrapSelection('`', '`')}
      />

      <div className={cn("w-px h-5 bg-line mx-0.5")} />

      <ToolbarButton
        icon={<Link className={cn("w-4 h-4")} />}
        label="Link"
        onClick={insertLinkMarkdown}
      />
    </div>,
    document.body
  );
}
