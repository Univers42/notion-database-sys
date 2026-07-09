/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GroupSectionHeader.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 14:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 14:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

/** Notion-model stacked-group header: colored value chip + count, with a
 *  chevron that minimizes the section (aria-expanded carries the state). */
export function GroupSectionHeader({ label, color, count, collapsed, onToggle }: Readonly<{
  label: string;
  color: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}>) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={!collapsed}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} group ${label}`}
      className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-hover-surface transition-colors w-fit')}>
      <ChevronDown className={cn(`w-3.5 h-3.5 text-ink-muted transition-transform ${collapsed ? '-rotate-90' : ''}`)} />
      <span className={cn(`px-2 py-0.5 rounded text-xs font-semibold ${color}`)}>{label}</span>
      <span className={cn('text-xs text-ink-muted tabular-nums')}>{count}</span>
    </button>
  );
}
