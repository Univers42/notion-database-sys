/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   EquationBlock.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:11 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { cn } from '../../utils/cn';

/** Renders a KaTeX equation block with inline editing. */
export function EquationBlock({ block, pageId }: Readonly<BlockRendererProps>) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const [editing, setEditing] = useState(!block.content);
  const [latex, setLatex] = useState(block.content || '');
  const previewRef = useRef<HTMLDivElement>(null);

  // Dynamically import KaTeX for rendering
  useEffect(() => {
    if (!editing && block.content && previewRef.current) {
      import('katex').then(katex => {
        if (!previewRef.current) return;
        try {
          previewRef.current.innerHTML = katex.default.renderToString(block.content, {
            displayMode: true,
            throwOnError: false,
            output: 'html',
          });
        } catch {
          previewRef.current.innerHTML = `<span class="text-danger-text text-sm">Invalid equation</span>`;
        }
      }).catch(() => {
        // KaTeX not available — show raw LaTeX
        if (previewRef.current) previewRef.current.textContent = block.content;
      });
    }
  }, [editing, block.content]);

  const handleSave = useCallback(() => {
    updateBlock(pageId, block.id, { content: latex });
    setEditing(false);
  }, [updateBlock, pageId, block.id, latex]);

  if (editing) {
    return (
      <div className={cn("my-2 border border-line rounded-lg overflow-hidden")}>
        <div className={cn("flex items-center justify-between px-3 py-1.5 bg-surface-secondary-soft border-b border-line-light")}>
          <span className={cn("text-xs font-medium text-ink-secondary")}>Equation (LaTeX)</span>
          <div className={cn("flex gap-1")}>
            <button
              onClick={() => setEditing(false)}
              className={cn("text-xs px-2 py-0.5 text-ink-muted hover:text-hover-text rounded")}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={cn("text-xs px-2 py-0.5 bg-accent text-ink-inverse rounded")}
            >
              Done
            </button>
          </div>
        </div>
        <textarea
          autoFocus
          value={latex}
          onChange={e => setLatex(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
          placeholder="E = mc^2"
          className={cn("w-full p-3 text-sm font-mono bg-surface-primary outline-none resize-none min-h-[60px]")}
          rows={Math.max(2, latex.split('\n').length)}
        />
      </div>
    );
  }

  if (!block.content) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn("my-2 w-full p-4 border border-dashed border-line-medium rounded-lg text-center text-sm text-ink-muted hover:bg-hover-surface transition-colors")}
      >
        Click to add an equation
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn("my-2 p-3 text-center cursor-pointer hover:bg-hover-surface rounded-lg transition-colors overflow-x-auto w-full border-0 bg-transparent font-[inherit]")}
    >
      <div ref={previewRef} />
    </button>
  );
}
