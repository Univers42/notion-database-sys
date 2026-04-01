import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';

export function TextBlock({ block, index, onChange, onKeyDown }: BlockRendererProps) {
  return (
    <EditableContent
      content={block.content}
      className="text-sm text-ink-body leading-relaxed py-0.5"
      placeholder={index === 0 ? "Type '/' for commands..." : ''}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  );
}
