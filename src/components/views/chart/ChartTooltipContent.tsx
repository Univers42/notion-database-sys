/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartTooltipContent.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { cn } from '../../../utils/cn';

interface TooltipItem {
  name?: string | number;
  value?: string | number;
  color?: string;
  fill?: string;
}

/** Shared hover tooltip for all chart types (label + per-series swatches). */
export function ChartTooltipContent({ active, payload, label, total }: Readonly<{
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  /** When set (donut), each row also shows its share of this total. */
  total?: number;
}>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={cn("rounded-lg border border-line bg-surface-primary shadow-lg px-3 py-2 text-xs")}>
      {label !== undefined && label !== '' && (
        <div className={cn("font-semibold text-ink mb-1")}>{label}</div>
      )}
      <div className={cn("flex flex-col gap-0.5")}>
        {payload.map((item, i) => {
          const value = typeof item.value === 'number' ? item.value : Number(item.value ?? 0);
          const share = total && total > 0 ? ` (${Math.round((value / total) * 100)}%)` : '';
          return (
            <div key={`${item.name}-${i}`} className={cn("flex items-center gap-1.5")}>
              <span className={cn("w-2.5 h-2.5 rounded-sm shrink-0")}
                style={{ background: item.color || item.fill || 'var(--color-chart-1)' }} />
              <span className={cn("text-ink-secondary truncate max-w-[140px]")}>{item.name}</span>
              <span className={cn("ml-auto font-medium text-ink tabular-nums")}>
                {value.toLocaleString()}{share}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
