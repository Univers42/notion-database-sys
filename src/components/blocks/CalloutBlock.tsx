/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalloutBlock.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:34:38 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:34:39 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { useDatabaseStore } from '../../store/useDatabaseStore';

const CALLOUT_ICONS = ['💡', '⚠️', '❗', '📌', '✅', '❌', 'ℹ️', '🔥', '💬', '📝', '🎯', '⭐'];

const CALLOUT_COLORS: Record<string, { bg: string; border: string }> = {
  '💡': { bg: 'bg-warning-surface', border: 'border-warning-border' },
  '⚠️': { bg: 'bg-amber-surface', border: 'border-amber-border' },
  '❗': { bg: 'bg-danger-surface', border: 'border-danger-border' },
  '📌': { bg: 'bg-accent-soft', border: 'border-accent-border-muted' },
  '✅': { bg: 'bg-success-surface', border: 'border-success-border' },
  '❌': { bg: 'bg-danger-surface', border: 'border-danger-border' },
  'ℹ️': { bg: 'bg-accent-soft', border: 'border-accent-border-muted' },
  '🔥': { bg: 'bg-orange-surface', border: 'border-orange-border' },
  '💬': { bg: 'bg-surface-secondary', border: 'border-line' },
  '📝': { bg: 'bg-purple-surface', border: 'border-purple-border' },
  '🎯': { bg: 'bg-indigo-surface', border: 'border-indigo-border' },
  '⭐': { bg: 'bg-warning-surface', border: 'border-warning-border' },
};

export function CalloutBlock({ block, pageId, onChange, onKeyDown }: BlockRendererProps) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const icon = block.color || '💡';
  const colors = CALLOUT_COLORS[icon] || { bg: 'bg-surface-secondary', border: 'border-line' };

  const handleIconSelect = useCallback(
    (emoji: string) => {
      updateBlock(pageId, block.id, { color: emoji });
      setShowIconPicker(false);
    },
    [updateBlock, pageId, block.id]
  );

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border my-0.5 ${colors.bg} ${colors.border}`}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowIconPicker(!showIconPicker)}
          className="text-lg hover:bg-hover-surface-white-soft3 rounded p-0.5 transition-colors shrink-0"
        >
          {icon}
        </button>
        {showIconPicker && (
          <div className="absolute top-full left-0 mt-1 bg-surface-primary border border-line rounded-lg shadow-lg z-50 p-2 grid grid-cols-6 gap-1 w-48">
            {CALLOUT_ICONS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleIconSelect(emoji)}
                className="text-lg hover:bg-hover-surface2 rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      <EditableContent
        content={block.content}
        className="text-sm text-ink-body leading-relaxed py-0.5 flex-1"
        placeholder="Type something..."
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
