import React, { useState, useCallback } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { useDatabaseStore } from '../../store/useDatabaseStore';

const CALLOUT_ICONS = ['💡', '⚠️', '❗', '📌', '✅', '❌', 'ℹ️', '🔥', '💬', '📝', '🎯', '⭐'];

const CALLOUT_COLORS: Record<string, { bg: string; border: string }> = {
  '💡': { bg: 'bg-yellow-50', border: 'border-yellow-200' },
  '⚠️': { bg: 'bg-amber-50', border: 'border-amber-200' },
  '❗': { bg: 'bg-red-50', border: 'border-red-200' },
  '📌': { bg: 'bg-blue-50', border: 'border-blue-200' },
  '✅': { bg: 'bg-green-50', border: 'border-green-200' },
  '❌': { bg: 'bg-red-50', border: 'border-red-200' },
  'ℹ️': { bg: 'bg-blue-50', border: 'border-blue-200' },
  '🔥': { bg: 'bg-orange-50', border: 'border-orange-200' },
  '💬': { bg: 'bg-gray-50', border: 'border-gray-200' },
  '📝': { bg: 'bg-purple-50', border: 'border-purple-200' },
  '🎯': { bg: 'bg-indigo-50', border: 'border-indigo-200' },
  '⭐': { bg: 'bg-yellow-50', border: 'border-yellow-200' },
};

export function CalloutBlock({ block, pageId, onChange, onKeyDown }: BlockRendererProps) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const icon = block.color || '💡';
  const colors = CALLOUT_COLORS[icon] || { bg: 'bg-gray-50', border: 'border-gray-200' };

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
          className="text-lg hover:bg-white/50 rounded p-0.5 transition-colors shrink-0"
        >
          {icon}
        </button>
        {showIconPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 grid grid-cols-6 gap-1 w-48">
            {CALLOUT_ICONS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleIconSelect(emoji)}
                className="text-lg hover:bg-gray-100 rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      <EditableContent
        content={block.content}
        className="text-sm text-gray-700 leading-relaxed py-0.5 flex-1"
        placeholder="Type something..."
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
