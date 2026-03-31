import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';

export function TextBlock({ block, onChange, onKeyDown }: BlockRendererProps) {
  return (
    <EditableContent
      content={block.content}
      className="text-sm text-ink-body leading-relaxed py-0.5"
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  );
}
