/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageBlock.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:30 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:35:31 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { FileText, ArrowUpRight } from 'lucide-react';

export function PageBlock({ block }: BlockRendererProps) {
  return (
    <div className="my-1">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-line hover:bg-hover-surface transition-colors text-left"
      >
        <FileText className="w-4 h-4 text-ink-muted shrink-0" />
        <span className="text-sm text-ink-body flex-1 truncate">
          {block.content || 'Untitled page'}
        </span>
        <ArrowUpRight className="w-3.5 h-3.5 text-ink-disabled" />
      </button>
    </div>
  );
}
