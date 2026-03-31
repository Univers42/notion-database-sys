import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';

const HEADING_STYLES: Record<string, string> = {
  heading_1: 'text-2xl font-bold text-ink mt-6 mb-1 leading-tight',
  heading_2: 'text-xl font-semibold text-ink mt-5 mb-1 leading-tight',
  heading_3: 'text-lg font-semibold text-ink-strong mt-4 mb-0.5 leading-snug',
  heading_4: 'text-base font-semibold text-ink-strong mt-3 mb-0.5 leading-snug',
};

const HEADING_PLACEHOLDERS: Record<string, string> = {
  heading_1: 'Heading 1',
  heading_2: 'Heading 2',
  heading_3: 'Heading 3',
  heading_4: 'Heading 4',
};

export function HeadingBlock({ block, onChange, onKeyDown }: BlockRendererProps) {
  return (
    <EditableContent
      content={block.content}
      className={HEADING_STYLES[block.type] || HEADING_STYLES.heading_1}
      placeholder={HEADING_PLACEHOLDERS[block.type] || 'Heading'}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  );
}
