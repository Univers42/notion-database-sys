/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartLegend.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { cn } from '../../../utils/cn';

/** One clickable legend entry; hidden entries render struck-through. */
export interface LegendItem {
  key: string;
  label: string;
  color: string;
  hidden: boolean;
}

/**
 * Interactive legend: clicking an entry toggles its group's visibility
 * (persisted in view settings — Notion behaviour). Hidden entries stay
 * listed, greyed and struck-through, so they can be re-enabled.
 */
export function ChartLegend({ items, onToggle }: Readonly<{
  items: LegendItem[];
  onToggle: (key: string) => void;
}>) {
  if (items.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-2")}>
      {items.map(item => (
        <button key={item.key} onClick={() => onToggle(item.key)}
          title={item.hidden ? 'Show group' : 'Hide group'}
          className={cn("flex items-center gap-1.5 text-xs rounded px-1 py-0.5 transition-colors hover:bg-hover-surface-soft2")}>
          <span className={cn("w-2.5 h-2.5 rounded-sm shrink-0")}
            style={{ background: item.hidden ? 'var(--color-chart-muted, #d0d0d0)' : item.color, opacity: item.hidden ? 0.5 : 1 }} />
          <span className={cn(item.hidden ? 'line-through text-ink-disabled' : 'text-ink-secondary')}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
