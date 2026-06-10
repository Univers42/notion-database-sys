/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartCanvas.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── ChartCanvas — lazy entry that pulls in the recharts chunk ──────────────
// ChartView lazy-imports this module; everything recharts stays behind it.

import React, { useState } from 'react';
import type { ChartResult } from '../../../lib/chart/chartTypes';
import type { ViewSettings } from '../../../types/database';
import type { ChartType } from './useChartData';
import { ChartBarsChart } from './ChartBars';
import { ChartLineChart } from './ChartLine';
import { ChartDonutChart } from './ChartDonut';
import { ChartLegend } from './ChartLegend';
import { ChartDrilldown } from './ChartDrilldown';
import type { DrilldownTarget, DrilldownPage } from './ChartDrilldown';
import { heightFor, legendItems } from './ChartCanvasHelpers';
import { cn } from '../../../utils/cn';

export interface ChartCanvasProps {
  result: ChartResult;
  settings: ViewSettings;
  chartType: Exclude<ChartType, 'number'>;
  onToggleGroup: (key: string) => void;
  hiddenLabelFor: (key: string) => string;
  resolvePages: (ids: string[]) => DrilldownPage[];
  /** Server-truth drilldown: list rows from the live mount on demand. */
  fetchDrilldownRows?: (target: DrilldownTarget) => Promise<DrilldownPage[]>;
  onOpenPage: (id: string) => void;
}

/** Chart body: typed chart + interactive legend + drilldown + cap notice. */
export default function ChartCanvas({
  result, settings, chartType, onToggleGroup, hiddenLabelFor, resolvePages,
  fetchDrilldownRows, onOpenPage,
}: Readonly<ChartCanvasProps>) {
  const [drilldown, setDrilldown] = useState<DrilldownTarget | null>(null);
  const isCountAgg = !settings.yAxisProperty || settings.yAxisAggregation === 'count';
  const drillCount = drilldown && fetchDrilldownRows && isCountAgg
    ? result.categories[drilldown.categoryIndex]?.values[drilldown.seriesKey]
    : undefined;
  const height = heightFor(settings);
  const legend = settings.showLegend !== false
    ? legendItems(result, settings, hiddenLabelFor)
    : [];
  const truncated = result.truncatedGroups || result.truncatedSeries;

  let chart: React.ReactNode = null;
  if (chartType === 'vertical_bar' || chartType === 'horizontal_bar') {
    chart = <ChartBarsChart result={result} settings={settings}
      horizontal={chartType === 'horizontal_bar'} onSliceClick={setDrilldown} />;
  } else if (chartType === 'line') {
    chart = <ChartLineChart result={result} settings={settings} onSliceClick={setDrilldown} />;
  } else {
    chart = <ChartDonutChart result={result} settings={settings}
      isDonut={chartType === 'donut'} onSliceClick={setDrilldown} />;
  }

  return (
    <div className={cn("flex-1 flex flex-col items-stretch overflow-auto bg-surface-primary p-4")}>
      <div className={cn("relative w-full")} style={{ height }}>
        {chart}
        {drilldown && (
          <ChartDrilldown result={result} target={drilldown}
            resolvePages={resolvePages} fetchRows={fetchDrilldownRows}
            itemCount={drillCount} onOpenPage={onOpenPage}
            onClose={() => setDrilldown(null)} />
        )}
      </div>
      <ChartLegend items={legend} onToggle={onToggleGroup} />
      {truncated && (
        <div className={cn("text-center text-[11px] text-ink-muted pb-1")}>
          Showing the top {result.truncatedGroups ? '200 groups' : ''}
          {result.truncatedGroups && result.truncatedSeries ? ' and ' : ''}
          {result.truncatedSeries ? '50 subgroups' : ''} — remaining data is folded into “Other”.
        </div>
      )}
    </div>
  );
}
