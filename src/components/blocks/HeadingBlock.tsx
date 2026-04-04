/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   HeadingBlock.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:35:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { cn } from '../../utils/cn';

const HEADING_STYLES: Record<string, string> = {
  heading_1: 'text-2xl font-bold text-ink mt-6 mb-1 leading-tight',
  heading_2: 'text-xl font-semibold text-ink mt-5 mb-1 leading-tight',
  heading_3: 'text-lg font-semibold text-ink-strong mt-4 mb-0.5 leading-snug',
  heading_4: 'text-base font-semibold text-ink-strong mt-3 mb-0.5 leading-snug',
  heading_5: 'text-sm font-semibold text-ink-strong mt-2 mb-0.5 leading-snug',
  heading_6: 'text-xs font-semibold text-ink-secondary mt-2 mb-0.5 leading-snug uppercase tracking-wide',
};

const HEADING_PLACEHOLDERS: Record<string, string> = {
  heading_1: 'Heading 1',
  heading_2: 'Heading 2',
  heading_3: 'Heading 3',
  heading_4: 'Heading 4',
  heading_5: 'Heading 5',
  heading_6: 'Heading 6',
};

export function HeadingBlock({ block, onChange, onKeyDown }: Readonly<BlockRendererProps>) {
  return (
    <EditableContent
      content={block.content}
      className={cn(HEADING_STYLES[block.type] || HEADING_STYLES.heading_1)}
      placeholder={HEADING_PLACEHOLDERS[block.type] || 'Heading'}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  );
}
