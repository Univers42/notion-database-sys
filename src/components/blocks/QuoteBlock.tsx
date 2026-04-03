/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   QuoteBlock.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:32 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { cn } from '../../utils/cn';

/** Renders a blockquote block with left border accent. */
export function QuoteBlock({ block, onChange, onKeyDown }: Readonly<BlockRendererProps>) {
  return (
    <div className={cn("flex my-0.5")}>
      <div className={cn("w-1 bg-surface-inverse rounded-full shrink-0 mr-3")} />
      <EditableContent
        content={block.content}
        className={cn("text-sm text-ink-body-light leading-relaxed py-0.5 italic flex-1")}
        placeholder="Quote"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
