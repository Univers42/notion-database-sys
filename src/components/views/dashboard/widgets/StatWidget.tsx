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
import type { DashboardWidget, SchemaProperty } from '../../../../types/database';
import { formatNumber } from '../constants';
import { StatIconBadge, STAT_LOOK } from '../StatComponents';
import { resolveStatValue, statKind, type ComputedData } from '../dashboardAggregates';
import { cn } from '../../../../utils/cn';

export type { ComputedData } from '../dashboardAggregates';

/** Single chart data item with count, color class, and label. */
export type ChartItem = { count: number; color: string; label: string };

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
