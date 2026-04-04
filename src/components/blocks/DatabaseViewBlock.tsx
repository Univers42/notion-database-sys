/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DatabaseViewBlock.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:34:54 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:34:55 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { Table, Columns, LayoutGrid, List } from 'lucide-react';
import { cn } from '../../utils/cn';

const VIEW_CONFIG: Record<string, { icon: typeof Table; label: string }> = {
  table_view: { icon: Table, label: 'Table view' },
  board_view: { icon: Columns, label: 'Board view' },
  gallery_view: { icon: LayoutGrid, label: 'Gallery view' },
  list_view: { icon: List, label: 'List view' },
};

export function DatabaseViewBlock({ block }: Readonly<BlockRendererProps>) {
  const config = VIEW_CONFIG[block.type] || VIEW_CONFIG.table_view;
  const Icon = config.icon;

  return (
    <div className={cn("my-2 border border-line rounded-lg overflow-hidden")}>
      <div className={cn("flex items-center gap-2 px-4 py-3 bg-surface-secondary border-b border-line")}>
        <Icon className={cn("w-4 h-4 text-ink-secondary")} />
        <span className={cn("text-sm font-medium text-ink-body")}>
          {block.content || config.label}
        </span>
      </div>
      <div className={cn("px-4 py-8 text-center")}>
        <p className={cn("text-xs text-ink-muted")}>
          Linked {config.label.toLowerCase()} — click to configure
        </p>
      </div>
    </div>
  );
}
