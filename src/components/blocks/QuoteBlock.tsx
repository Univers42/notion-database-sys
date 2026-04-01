/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   QuoteBlock.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:32 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:35:33 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { EditableContent } from './EditableContent';

export function QuoteBlock({ block, onChange, onKeyDown }: BlockRendererProps) {
  return (
    <div className="flex my-0.5">
      <div className="w-1 bg-surface-inverse rounded-full shrink-0 mr-3" />
      <EditableContent
        content={block.content}
        className="text-sm text-ink-body-light leading-relaxed py-0.5 italic flex-1"
        placeholder="Quote"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
