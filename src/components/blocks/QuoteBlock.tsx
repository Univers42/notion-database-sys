import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';

export function QuoteBlock({ block, onChange, onKeyDown }: BlockRendererProps) {
  return (
    <div className="flex my-0.5">
      <div className="w-1 bg-gray-900 rounded-full shrink-0 mr-3" />
      <EditableContent
        content={block.content}
        className="text-sm text-gray-600 leading-relaxed py-0.5 italic flex-1"
        placeholder="Quote"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
