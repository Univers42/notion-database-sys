/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartView.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { Suspense, useCallback } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { BarChart3 } from 'lucide-react';
import type { ChartType } from './useChartData';
import { useServerChartData } from './useServerChartData';
import { fetchServerDrilldownRows } from './chartServerDrilldown';
import { applyConditionalChartColors } from '../../../lib/conditionalColor';
import { getChartTypeDef } from '../../../lib/chart/chartTypeRegistry';
import { isLiveDatabaseId } from '../../../store/live/liveTypes';
import type { DrilldownPage, DrilldownTarget } from './ChartDrilldown';
import { cn } from '../../../utils/cn';
import { useViewPages } from '../../../hooks/useViewPages';

// Lazy boundary: everything recharts lives behind this import, so the chart
// chunk only loads when a chart view is actually rendered.
const ChartCanvas = React.lazy(() => import('./ChartCanvas'));
const EChartsCanvas = React.lazy(() => import('./echarts/EChartsCanvas'));

function EmptyChartState() {
  return (
    <div className={cn("flex-1 flex items-center justify-center p-8 bg-surface-primary")}>
      <div className={cn("text-center text-ink-muted max-w-sm")}>
        <BarChart3 className={cn("w-12 h-12 mx-auto mb-3 text-ink-disabled")} />
        <p className={cn("font-medium mb-1")}>Configure your chart</p>
        <p className={cn("text-sm")}>Open view settings to select an X-axis property for charting.</p>
      </div>
    </div>
  );
}

function ChartLoading() {
  return (
    <div className={cn("flex-1 flex items-center justify-center p-8 bg-surface-primary")}>
      <div className={cn("text-sm text-ink-muted animate-pulse")}>Loading chart…</div>
    </div>
  );
}

/** Renders the chart view: number type inline, the rest via the lazy canvas. */
export function ChartView() {
  const activeViewId = useActiveViewId();
  const {
    views, databases, pages: pagesMap, openPage, getPageTitle, updateViewSettings,
  } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const settings = view?.settings || {};
  const pages = useViewPages(view?.id);

  const labelResolver = useCallback((propId: string, key: string) => {
    const prop = database?.properties[propId];
    if (!prop || !['relation', 'person', 'user'].includes(prop.type)) return undefined;
    const target = pagesMap[key];
    return target ? getPageTitle(target) : undefined;
  }, [database, pagesMap, getPageTitle]);

  const { result: rawResult, isServerTruth } = useServerChartData(view, database, pages, settings, labelResolver);
  // Conditional `equals` rules on the x/groupBy property override the palette
  // (the canvas prefers an explicit category/series color when present).
  const result = applyConditionalChartColors(rawResult, settings, database?.properties ?? {});

  if (!view || !database) return null;
  if (!settings.xAxisProperty) return <EmptyChartState />;

  const typeDef = getChartTypeDef(settings.chartType);
  const chartType: ChartType = typeDef.engine === 'recharts'
    ? ((typeDef.id as ChartType) || 'vertical_bar')
    : 'vertical_bar';
  if (typeDef.id === 'number') {
    const label = settings.yAxisProperty
      ? `${settings.yAxisAggregation ?? 'sum'}`
      : 'count';
    return (
      <div className={cn("flex-1 flex items-center justify-center p-8 bg-surface-primary")}>
        <div className={cn("text-center")}>
          <div className={cn("text-6xl font-bold text-ink tabular-nums")}>{result.total.toLocaleString()}</div>
          <div className={cn("text-sm text-ink-secondary mt-2")}>Total {label} · {pages.length} records</div>
        </div>
      </div>
    );
  }

  const onToggleGroup = (key: string) => {
    const hidden = settings.hiddenGroups ?? [];
    updateViewSettings(view.id, {
      hiddenGroups: hidden.includes(key) ? hidden.filter(k => k !== key) : [...hidden, key],
    });
  };
  const hiddenLabelFor = (key: string) => {
    const props = [settings.yAxisGroupBy, settings.xAxisProperty];
    for (const pid of props) {
      const opt = pid ? database.properties[pid]?.options?.find(o => o.id === key) : undefined;
      if (opt) return opt.value;
    }
    return labelResolver(settings.yAxisGroupBy ?? settings.xAxisProperty ?? '', key) ?? key;
  };
  const resolvePages = (ids: string[]): DrilldownPage[] => ids
    .map(id => pagesMap[id])
    .filter(Boolean)
    .map(p => ({ id: p.id, title: getPageTitle(p), icon: p.icon }));
  const fetchDrilldownRows = isServerTruth
    ? (target: DrilldownTarget) => fetchServerDrilldownRows({
      view, database, settings, result, target, storePages: pagesMap,
    })
    : undefined;
  const isLive = isLiveDatabaseId(view.databaseId);
  const badge = isLive
    ? (isServerTruth ? 'Live · all rows' : `Live · first ${pages.length} rows`)
    : null;

  return (
    <div className={cn("relative flex-1 flex flex-col min-h-0")}>
      {badge && (
        <div className={cn("absolute top-2 right-4 z-10 text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-ink-muted border border-line select-none")}>
          {badge}
        </div>
      )}
      <Suspense fallback={<ChartLoading />}>
        {typeDef.engine === 'echarts' ? (
          <EChartsCanvas viewId={view.id} result={result} settings={settings} />
        ) : (
          <ChartCanvas result={result} settings={settings}
            chartType={chartType as Exclude<ChartType, 'number'>}
            onToggleGroup={onToggleGroup} hiddenLabelFor={hiddenLabelFor}
            resolvePages={resolvePages} fetchDrilldownRows={fetchDrilldownRows}
            onOpenPage={openPage} />
        )}
      </Suspense>
    </div>
  );
}
