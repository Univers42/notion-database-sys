/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   StatWidget.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:42 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Hash, TrendingUp, Activity, ArrowDownToLine, ArrowUpToLine, CheckCircle, Shapes } from 'lucide-react';
import type { DashboardWidget, SchemaProperty } from '../../../../types/database';
import { formatNumber } from '../constants';
import { StatIconBadge } from '../StatComponents';
import { resolveStatValue, statKind, type ComputedData, type StatKind } from '../dashboardAggregates';
import { cn } from '../../../../utils/cn';

export type { ComputedData } from '../dashboardAggregates';

/** Single chart data item with count, color class, and label. */
export type ChartItem = { count: number; color: string; label: string };

// By what the tile measures, so moving a tile keeps its icon.
const STAT_LOOK: Record<StatKind, { icon: React.ReactNode; color: 'blue' | 'purple' | 'green' | 'amber' | 'pink' | 'cyan' }> = {
  count: { icon: <Hash className={cn("w-5 h-5")} />, color: 'blue' },
  checked: { icon: <CheckCircle className={cn("w-5 h-5")} />, color: 'green' },
  sum: { icon: <TrendingUp className={cn("w-5 h-5")} />, color: 'amber' },
  average: { icon: <Activity className={cn("w-5 h-5")} />, color: 'purple' },
  min: { icon: <ArrowDownToLine className={cn("w-5 h-5")} />, color: 'cyan' },
  max: { icon: <ArrowUpToLine className={cn("w-5 h-5")} />, color: 'pink' },
  distinct: { icon: <Shapes className={cn("w-5 h-5")} />, color: 'cyan' },
};

/** Renders a stat widget card with icon, value, title, and optional subtext. */
export function renderStatWidget(widget: DashboardWidget, prop: SchemaProperty | null, data: ComputedData, total: number) {
  const { value, subtext } = resolveStatValue(prop, data, widget, total);
  const look = STAT_LOOK[statKind(prop, widget)];
  return (
    <div className={cn("p-4 h-full flex items-start gap-3")}>
      <StatIconBadge color={look.color}>{look.icon}</StatIconBadge>
      <div className={cn("flex-1 min-w-0")}>
        <div className={cn("text-2xl font-bold text-ink tabular-nums leading-none mb-1")}>{formatNumber(value)}</div>
        <div className={cn("text-xs text-ink-secondary truncate")}>{widget.title}</div>
        {subtext && <div className={cn("text-[10px] text-ink-muted mt-0.5")}>{subtext}</div>}
      </div>
    </div>
  );
}
