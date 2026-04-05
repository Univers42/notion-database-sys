/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   WidgetRenderer.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:42 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { DashboardWidget, SchemaProperty } from '../../../types/database';
import { EmptyWidget } from './StatComponents';
import { RecentList } from './DataComponents';
import { renderStatWidget } from './widgets/StatWidget';
import { renderSelectChart } from './widgets/ChartStyles';
import { renderNumberChart } from './widgets/NumberChartWidget';
import { renderTableWidget } from './widgets/TableWidget';
import type { ComputedData } from './widgets/StatWidget';
import { cn } from '../../../utils/cn';

export type { ComputedData } from './widgets/StatWidget';

/**
 * Dispatches a dashboard widget to the appropriate renderer based on widget type.
 *
 * @param widget - Widget configuration
 * @param idx - Widget index for color cycling
 * @param pages - Database pages to render
 * @param propsMap - Property schema lookup
 * @param data - Pre-computed aggregation data
 * @param openPage - Callback to open a page
 * @param getPageTitle - Callback to resolve page title
 */
export function renderWidget(
  widget: DashboardWidget, idx: number,
  pages: { id: string; icon?: string; updatedAt: string; properties: Record<string, unknown> }[],
  propsMap: Record<string, SchemaProperty>,
  data: ComputedData,
  openPage: (id: string) => void,
  getPageTitle: (page: { properties: Record<string, unknown> }) => string,
) {
  const prop = widget.propertyId ? propsMap[widget.propertyId] || null : null;

  if (widget.type === 'stat') return renderStatWidget(widget, idx, prop, data, pages.length);

  if (widget.type === 'chart') {
    if (!prop) return <EmptyWidget title={widget.title} message="No property configured" />;
    if ((prop.type === 'select' || prop.type === 'status') && data.selectCounts[prop.id]) {
      const chartData = Object.values(data.selectCounts[prop.id]).sort((a, b) => b.count - a.count);
      const total = chartData.reduce((s, d) => s + d.count, 0);
      return renderSelectChart(widget, chartData, total, pages, propsMap);
    }
    if (prop.type === 'number' && data.numberAggs[prop.id]) return renderNumberChart(widget, data.numberAggs[prop.id]);
    return <EmptyWidget title={widget.title} message="No data for this property" />;
  }

  if (widget.type === 'list') {
    const recent = [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
    return (
      <div className={cn("p-5 h-full flex flex-col")}>
        <h3 className={cn("text-sm font-semibold text-ink mb-3")}>{widget.title}</h3>
        <div className={cn("flex-1 overflow-auto")}><RecentList pages={recent} openPage={openPage} getPageTitle={getPageTitle} /></div>
      </div>
    );
  }

  if (widget.type === 'table') return renderTableWidget(widget, prop, pages, openPage, getPageTitle);

  return <EmptyWidget title={widget.title} message="Unknown widget type" />;
}
