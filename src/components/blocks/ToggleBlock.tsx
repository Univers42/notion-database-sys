/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ToggleBlock.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:50 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Renders a collapsible toggle block with nested child blocks. */
export function ToggleBlock({ block, pageId, onChange, onKeyDown }: Readonly<BlockRendererProps>) {
  const toggleCollapsed = useDatabaseStore(s => s.toggleBlockCollapsed);

  const handleToggle = useCallback(() => {
    toggleCollapsed(pageId, block.id);
  }, [toggleCollapsed, pageId, block.id]);

  return (
    <div className={cn("pl-0.5")}>
      <div className={cn("flex items-start gap-1")}>
        <button
          type="button"
          onClick={handleToggle}
          className={cn("shrink-0 mt-[3px] w-5 h-5 rounded hover:bg-hover-surface2 flex items-center justify-center transition-transform")}
        >
          <ChevronRight
            className={cn(`w-3.5 h-3.5 text-ink-secondary transition-transform ${
              !block.collapsed ? 'rotate-90' : ''
            }`)}
          />
        </button>
        <EditableContent
          content={block.content}
          className={cn("text-sm text-ink-body leading-relaxed py-0.5 flex-1")}
          placeholder="Toggle"
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      </div>
      {!block.collapsed && block.children && block.children.length > 0 && (
        <div className={cn("ml-6 mt-0.5 pl-3 border-l-2 border-line-light")}>
          <div className={cn("text-xs text-ink-muted py-1")}>
            {block.children.length} nested block(s)
          </div>
        </div>
      )}
      {!block.collapsed && (!block.children || block.children.length === 0) && (
        <div className={cn("ml-6 mt-0.5 pl-3 border-l-2 border-line-light")}>
          <div className={cn("text-xs text-ink-disabled py-1 italic")}>Empty toggle. Click to add content.</div>
        </div>
      )}
    </div>
  );
}
