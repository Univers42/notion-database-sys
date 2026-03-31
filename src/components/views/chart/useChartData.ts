/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useChartData.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:07:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useMemo } from 'react';

export type ChartType = 'vertical_bar' | 'horizontal_bar' | 'line' | 'donut' | 'pie' | 'number';

export interface ChartDataItem {
  label: string;
  value: number;
  color: string;
}

export const CHART_COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)',
  'var(--color-chart-6)', 'var(--color-chart-7)', 'var(--color-chart-8)', 'var(--color-chart-9)', 'var(--color-chart-10)',
];

export function useChartData(
  database: { properties: Record<string, any> } | null,
  pages: { properties: Record<string, any> }[],
  xAxisProperty: string | undefined,
  yAxisProperty: string | undefined,
  yAxisAggregation: string,
): ChartDataItem[] {
  return useMemo(() => {
    if (!database || !xAxisProperty) return [];

    const xProp = database.properties[xAxisProperty];
    if (!xProp) return [];

    // Group pages by x-axis value
    const grouped: Record<string, { label: string; values: number[]; color: string }> = {};

    pages.forEach(page => {
      const xVal = page.properties[xAxisProperty];
      let label: string;
      let colorClass = '';

      if (xProp.type === 'select') {
        const opt = xProp.options?.find((o: any) => o.id === xVal);
        label = opt?.value || 'None';
        colorClass = opt?.color || '';
      } else if (xProp.type === 'checkbox') {
        label = xVal ? 'Checked' : 'Unchecked';
      } else {
        label = xVal != null ? String(xVal) : 'None';
      }

      if (!grouped[label]) {
        grouped[label] = { label, values: [], color: colorClass };
      }

      if (yAxisProperty && database.properties[yAxisProperty]) {
        const yVal = page.properties[yAxisProperty];
        if (typeof yVal === 'number') {
          grouped[label].values.push(yVal);
        } else if (typeof yVal === 'string' && !isNaN(Number(yVal))) {
          grouped[label].values.push(Number(yVal));
        }
      }
      grouped[label].values.push(1); // always push 1 for count
    });

    return Object.entries(grouped).map(([label, data], i) => {
      let value: number;
      if (yAxisAggregation === 'count') {
        value = data.values.length / (yAxisProperty ? 2 : 1); // count pages
      } else {
        const nums = yAxisProperty ? data.values.filter((_, idx) => idx % 2 === 0) : data.values;
        if (yAxisAggregation === 'sum') value = nums.reduce((s, n) => s + n, 0);
        else if (yAxisAggregation === 'average') value = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
        else value = nums.length;
      }

      return { label, value, color: CHART_COLORS[i % CHART_COLORS.length] };
    }).sort((a, b) => b.value - a.value);
  }, [pages, database, xAxisProperty, yAxisProperty, yAxisAggregation]);
}
