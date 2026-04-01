/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   EquationBlock.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:11 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:35:12 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/useDatabaseStore';

export function EquationBlock({ block, pageId }: BlockRendererProps) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const [editing, setEditing] = useState(!block.content);
  const [latex, setLatex] = useState(block.content || '');
  const previewRef = useRef<HTMLDivElement>(null);

  // Dynamically import KaTeX for rendering
  useEffect(() => {
    if (!editing && block.content && previewRef.current) {
      import('katex').then(katex => {
        try {
          previewRef.current!.innerHTML = katex.default.renderToString(block.content, {
            displayMode: true,
            throwOnError: false,
            output: 'html',
          });
        } catch {
          previewRef.current!.innerHTML = `<span class="text-danger-text text-sm">Invalid equation</span>`;
        }
      }).catch(() => {
        // KaTeX not available — show raw LaTeX
        previewRef.current!.textContent = block.content;
      });
    }
  }, [editing, block.content]);

  const handleSave = useCallback(() => {
    updateBlock(pageId, block.id, { content: latex });
    setEditing(false);
  }, [updateBlock, pageId, block.id, latex]);

  if (editing) {
    return (
      <div className="my-2 border border-line rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-secondary-soft border-b border-line-light">
          <span className="text-xs font-medium text-ink-secondary">Equation (LaTeX)</span>
          <div className="flex gap-1">
            <button
              onClick={() => setEditing(false)}
              className="text-xs px-2 py-0.5 text-ink-muted hover:text-hover-text rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-2 py-0.5 bg-accent text-ink-inverse rounded"
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
          className="w-full p-3 text-sm font-mono bg-surface-primary outline-none resize-none min-h-[60px]"
          rows={Math.max(2, latex.split('\n').length)}
        />
      </div>
    );
  }

  if (!block.content) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="my-2 w-full p-4 border border-dashed border-line-medium rounded-lg text-center text-sm text-ink-muted hover:bg-hover-surface transition-colors"
      >
        Click to add an equation
      </button>
    );
  }

  return (
    <div
      ref={previewRef}
      onClick={() => setEditing(true)}
      className="my-2 p-3 text-center cursor-pointer hover:bg-hover-surface rounded-lg transition-colors overflow-x-auto"
    />
  );
}
