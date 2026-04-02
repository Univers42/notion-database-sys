/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TodoBlock.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 15:07:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';

export function TodoBlock({ block, pageId, onChange, onKeyDown }: Readonly<BlockRendererProps>) {
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
            ? 'bg-accent border-accent-border text-ink-inverse'
            : 'border-line-medium hover:border-hover-border-strong bg-surface-primary'
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
          block.checked ? 'text-ink-muted line-through' : 'text-ink-body'
        }`}
        placeholder="To-do"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
