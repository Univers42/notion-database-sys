import React, { useCallback } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { useDatabaseStore } from '../../store/useDatabaseStore';

export function TodoBlock({ block, pageId, onChange, onKeyDown }: BlockRendererProps) {
  const toggleChecked = useDatabaseStore(s => s.toggleBlockChecked);

  const handleToggle = useCallback(() => {
    toggleChecked(pageId, block.id);
  }, [toggleChecked, pageId, block.id]);

  return (
    <div className="flex items-start gap-2 pl-1">
      <button
        type="button"
        onClick={handleToggle}
        className={`shrink-0 mt-[3px] w-4 h-4 rounded border transition-colors ${
          block.checked
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        {block.checked && (
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M4 8l2.5 2.5L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <EditableContent
        content={block.content}
        className={`text-sm leading-relaxed py-0.5 flex-1 ${
          block.checked ? 'text-gray-400 line-through' : 'text-gray-700'
        }`}
        placeholder="To-do"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
