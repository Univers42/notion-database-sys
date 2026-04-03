/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartView.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 00:11:41 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { BarChart3 } from 'lucide-react';
import { useChartData } from './useChartData';
import type { ChartType } from './useChartData';
import { VerticalBarChart, HorizontalBarChart } from './BarCharts';
import { LineChart } from './LineChart';
import { DonutPieChart } from './DonutPieChart';

export function ChartView() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const settings = view?.settings || {};
  const chartType: ChartType = (settings.chartType as ChartType) || 'vertical_bar';
  const xAxisProperty = settings.xAxisProperty;
  const yAxisProperty = settings.yAxisProperty;
  const yAxisAggregation = settings.yAxisAggregation || 'count';

  const pages = view ? getPagesForView(view.id) : [];
  const chartData = useChartData(database, pages, xAxisProperty, yAxisProperty, yAxisAggregation);

  if (!view || !database) return null;

  if (!xAxisProperty) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-primary">
        <div className="text-center text-ink-muted max-w-sm">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-ink-disabled" />
          <p className="font-medium mb-1">Configure your chart</p>
          <p className="text-sm">Open view settings to select an X-axis property for charting.</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (chartType === 'number') {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-primary">
        <div className="text-center">
          <div className="text-6xl font-bold text-ink tabular-nums">{total.toLocaleString()}</div>
          <div className="text-sm text-ink-secondary mt-2">Total {yAxisAggregation} &middot; {pages.length} records</div>
        </div>
      </div>
    );
  }

  if (chartType === 'vertical_bar') return <VerticalBarChart chartData={chartData} maxValue={maxValue} />;
  if (chartType === 'horizontal_bar') return <HorizontalBarChart chartData={chartData} maxValue={maxValue} />;
  if (chartType === 'line') return <LineChart chartData={chartData} maxValue={maxValue} />;
  if (chartType === 'donut' || chartType === 'pie') {
    return <DonutPieChart chartData={chartData} total={total} isDonut={chartType === 'donut'} />;
  }

  return null;
}
