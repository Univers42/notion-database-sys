/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   EditableContent.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:02 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useRef, useEffect, useCallback } from 'react';
import { parseInlineMarkdown } from '../../lib/markdown';
import { cn } from '../../utils/cn';

/** Props for {@link EditableContent}. */
export interface EditableContentProps {
  content: string;
  className?: string;
  placeholder?: string;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tag?: 'div' | 'span';
}

/** Contenteditable wrapper that syncs with block state and renders inline markdown. */
export function EditableContent({
  content,
  className = '',
  placeholder = '',
  onChange,
  onKeyDown,
}: Readonly<EditableContentProps>) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync rendered markdown whenever block content changes.
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const html = parseInlineMarkdown(escapeHtml(content));
    if (el.innerHTML !== html) {
      el.innerHTML = html;
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
    const markdown = serializeEditableMarkdown(ref.current);
    onChange(markdown);
  }, [onChange]);

  return (
    <div // NOSONAR - contentEditable block editor requires div with textbox role
      ref={ref}
      role="textbox"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      data-block-editor
      className={cn(`outline-none ${className} empty:before:content-[attr(data-placeholder)] empty:before:text-ink-muted`)}
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={onKeyDown}
      spellCheck
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function serializeEditableMarkdown(root: HTMLElement): string {
  return Array.from(root.childNodes).map(node => serializeNode(node)).join('');
}

function serializeNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const inner = Array.from(el.childNodes).map(child => serializeNode(child)).join('');
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'br':
      return '\n';
    case 'strong':
    case 'b':
      return `**${inner}**`;
    case 'em':
    case 'i':
      return `*${inner}*`;
    case 'u':
      return `__${inner}__`;
    case 'del':
    case 's':
      return `~~${inner}~~`;
    case 'code':
      return `\`${inner}\``;
    case 'mark':
      return `==${inner}==`;
    case 'a': {
      const href = el.getAttribute('href') || '';
      return href ? `[${inner}](${href})` : inner;
    }
    default:
      return inner;
  }
}
