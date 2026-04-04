/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TextBlock.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:47 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:35:48 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { cn } from '../../utils/cn';

export function TextBlock({ block, index, onChange, onKeyDown }: Readonly<BlockRendererProps>) {
  return (
    <EditableContent
      content={block.content}
      className={cn("text-sm text-ink-body leading-relaxed py-0.5")}
      placeholder={index === 0 ? "Type '/' for commands..." : ''}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  );
}
