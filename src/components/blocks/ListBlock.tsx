import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';

export function ListBlock({ block, onChange, onKeyDown, index }: BlockRendererProps) {
  const isBulleted = block.type === 'bulleted_list';

  return (
    <div className="flex items-start gap-2 pl-1">
      <span className="text-sm leading-relaxed py-0.5 text-gray-500 select-none shrink-0 w-5 text-center">
        {isBulleted ? (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-600 mt-[7px]" />
        ) : (
          <span className="font-medium text-gray-600">{index + 1}.</span>
        )}
      </span>
      <EditableContent
        content={block.content}
        className="text-sm text-gray-700 leading-relaxed py-0.5 flex-1"
        placeholder="List item"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
