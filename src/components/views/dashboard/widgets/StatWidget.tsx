/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   StatWidget.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:42 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Hash, TrendingUp, Activity, BarChart3, PieChart, Users } from 'lucide-react';
import type { DashboardWidget, SchemaProperty } from '../../../../types/database';
import { STAT_COLORS, formatNumber } from '../constants';
import { StatIconBadge } from '../StatComponents';
import { cn } from '../../../../utils/cn';

/** Pre-computed aggregation data for dashboard widgets. */
export interface ComputedData {
  numberAggs: Record<string, { sum: number; count: number; min: number; max: number }>;
  selectCounts: Record<string, Record<string, { count: number; color: string; label: string }>>;
  checked: number;
  unchecked: number;
  recentCount: number;
}

/** Single chart data item with count, color class, and label. */
export type ChartItem = { count: number; color: string; label: string };

const STAT_ICONS = [
  <Hash className={cn("w-5 h-5")} />, <TrendingUp className={cn("w-5 h-5")} />,
  <Activity className={cn("w-5 h-5")} />, <BarChart3 className={cn("w-5 h-5")} />,
  <PieChart className={cn("w-5 h-5")} />, <Users className={cn("w-5 h-5")} />,
];

/** Resolves the display value and subtext for a stat widget from aggregated data. */
export function resolveStatValue(prop: SchemaProperty | null, data: ComputedData, widget: DashboardWidget, total: number) {
  let value = 0, subtext = '';
  if (!widget.propertyId || widget.aggregation === 'count') { value = total; }
  else if (prop?.type === 'number' && data.numberAggs[prop.id]) {
    const agg = data.numberAggs[prop.id];
    switch (widget.aggregation) {
      case 'sum': value = agg.sum; break;
      case 'average': value = Number((agg.sum / agg.count).toFixed(1)); subtext = `from ${agg.count} records`; break;
      case 'min': value = agg.min === Infinity ? 0 : agg.min; break;
      case 'max': value = agg.max === -Infinity ? 0 : agg.max; break;
      default: value = agg.sum;
    }
  } else if ((prop?.type === 'select' || prop?.type === 'status') && data.selectCounts[prop.id]) {
    value = Object.keys(data.selectCounts[prop.id]).length; subtext = 'distinct values';
  } else if (prop?.type === 'checkbox') {
    value = data.checked; subtext = `${Math.round((data.checked / Math.max(data.checked + data.unchecked, 1)) * 100)}% of total`;
  }
  return { value, subtext };
}

/** Renders a stat widget card with icon, value, title, and optional subtext. */
export function renderStatWidget(widget: DashboardWidget, idx: number, prop: SchemaProperty | null, data: ComputedData, total: number) {
  const { value, subtext } = resolveStatValue(prop, data, widget, total);
  return (
    <div className={cn("p-4 h-full flex items-start gap-3")}>
      <StatIconBadge color={STAT_COLORS[idx % STAT_COLORS.length]}>{STAT_ICONS[idx % STAT_ICONS.length]}</StatIconBadge>
      <div className={cn("flex-1 min-w-0")}>
        <div className={cn("text-2xl font-bold text-ink tabular-nums leading-none mb-1")}>{formatNumber(value)}</div>
        <div className={cn("text-xs text-ink-secondary truncate")}>{widget.title}</div>
        {subtext && <div className={cn("text-[10px] text-ink-muted mt-0.5")}>{subtext}</div>}
      </div>
    </div>
  );
}
