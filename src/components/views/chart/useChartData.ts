/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useChartData.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useChartData — thin memo bridge: view settings → chart engine ──────────

import { useMemo } from 'react';
import type { SchemaProperty, ViewSettings } from '../../../types/database';
import { buildChartData } from '../../../lib/chart/chartEngine';
import type {
  ChartAggregation, ChartPageLike, ChartResult, ChartSortMode,
} from '../../../lib/chart/chartTypes';
import { EMPTY_CHART_RESULT } from '../../../lib/chart/chartTypes';

/** Supported chart visualization types. */
export type ChartType = 'vertical_bar' | 'horizontal_bar' | 'line' | 'donut' | 'pie' | 'number';

/** Maps persisted view settings to a {@link ChartEngineInput}, memoized. */
export function useChartData(
  database: { properties: Record<string, SchemaProperty> } | null,
  pages: readonly ChartPageLike[],
  settings: ViewSettings,
  labelResolver?: (propId: string, key: string) => string | undefined,
): ChartResult {
  return useMemo(() => {
    const xProp = settings.xAxisProperty
      ? database?.properties[settings.xAxisProperty]
      : undefined;
    if (!database || !xProp) return EMPTY_CHART_RESULT;
    const yProp = settings.yAxisProperty
      ? database.properties[settings.yAxisProperty]
      : undefined;
    const groupByProp = settings.yAxisGroupBy
      ? database.properties[settings.yAxisGroupBy]
      : undefined;
    const aggregation: ChartAggregation = yProp
      ? ((settings.yAxisAggregation as ChartAggregation) ?? 'sum')
      : 'count';
    return buildChartData({
      pages,
      xProp,
      yProp,
      aggregation,
      groupByProp,
      sort: settings.xAxisSort as ChartSortMode | undefined,
      dateBucket: settings.xAxisDateBucket,
      omitZero: settings.xAxisOmitZero,
      cumulative: settings.yAxisCumulative,
      hiddenGroups: settings.hiddenGroups,
      manualGroupOrder: settings.manualGroupOrder,
      labelResolver,
    });
  }, [database, pages, settings, labelResolver]);
}
