// ═══════════════════════════════════════════════════════════════════════════════
// EditableContent — shared contentEditable primitive used by all text blocks
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useCallback } from 'react';
import { parseInlineMarkdown } from '../../lib/markdownEngine';

export interface EditableContentProps {
  content: string;
  className?: string;
  placeholder?: string;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tag?: 'div' | 'span';
}

export function EditableContent({
  content,
  className = '',
  placeholder = "Type '/' for commands...",
  onChange,
  onKeyDown,
}: EditableContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef(content);

  // Sync content from props only when it changed externally
  useEffect(() => {
    if (ref.current && content !== lastContentRef.current) {
      const el = ref.current;
      const html = parseInlineMarkdown(escapeHtml(content));
      if (el.innerHTML !== html) {
        el.innerHTML = html;
      }
      lastContentRef.current = content;
    }
  }, [content]);

  // Mount: set initial content
  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      ref.current.innerHTML = parseInlineMarkdown(escapeHtml(content));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const text = ref.current.textContent || '';
    lastContentRef.current = text;
    onChange(text);
  }, [onChange]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-block-editor
      className={`outline-none ${className} empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400`}
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={onKeyDown}
      spellCheck
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
