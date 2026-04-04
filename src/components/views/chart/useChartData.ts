/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useChartData.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useMemo } from 'react';
import type { SchemaProperty, PropertyValue, SelectOption } from '../../../types/database';
import { CHART_COLORS } from '../../../utils/color';
import { safeString } from '../../../utils/safeString';

/** Supported chart visualization types. */
export type ChartType = 'vertical_bar' | 'horizontal_bar' | 'line' | 'donut' | 'pie' | 'number';

/** Single data point for chart rendering. */
export interface ChartDataItem {
  label: string;
  value: number;
  color: string;
}

/**
 * Aggregates database pages into chart data items grouped by the x-axis property.
 *
 * @param database - Database schema with property definitions
 * @param pages - Pages to aggregate
 * @param xAxisProperty - Property ID for grouping
 * @param yAxisProperty - Optional property ID for value aggregation
 * @param yAxisAggregation - Aggregation function: 'count', 'sum', or 'average'
 * @returns Sorted chart data items with labels, values, and colors
 */
export function useChartData(
  database: { properties: Record<string, SchemaProperty> } | null,
  pages: { properties: Record<string, PropertyValue> }[],
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
        const opt = xProp.options?.find((o: SelectOption) => o.id === xVal);
        label = opt?.value || 'None';
        colorClass = opt?.color || '';
      } else if (xProp.type === 'checkbox') {
        label = xVal ? 'Checked' : 'Unchecked';
      } else {
        label = xVal == null ? 'None' : safeString(xVal);
      }

      if (!grouped[label]) {
        grouped[label] = { label, values: [], color: colorClass };
      }

      if (yAxisProperty && database.properties[yAxisProperty]) {
        const yVal = page.properties[yAxisProperty];
        if (typeof yVal === 'number') {
          grouped[label].values.push(yVal);
        } else if (typeof yVal === 'string' && !Number.isNaN(Number(yVal))) {
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
