/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ListBlock.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:25 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { cn } from '../../utils/cn';

/** Renders a bulleted or numbered list item block with editable content. */
export function ListBlock({ block, onChange, onKeyDown, index }: Readonly<BlockRendererProps>) {
  const isBulleted = block.type === 'bulleted_list';

  return (
    <div className={cn("flex items-start gap-2 pl-1")}>
      <span className={cn("text-sm leading-relaxed py-0.5 text-ink-secondary select-none shrink-0 w-5 text-center")}>
        {isBulleted ? (
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full bg-surface-inverse-soft mt-[7px]")} />
        ) : (
          <span className={cn("font-medium text-ink-body-light")}>{index + 1}.</span>
        )}
      </span>
      <EditableContent
        content={block.content}
        className={cn("text-sm text-ink-body leading-relaxed py-0.5 flex-1")}
        placeholder="List item"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
