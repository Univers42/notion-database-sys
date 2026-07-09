// ─── StatKpi — the Number widget body (Notion 2026 dashboards) ───────────────
// A big glanceable metric over the widget's backing view: count of records or
// sum/avg/min/max of a number property. Built on useViewPages, so the view's
// own filters AND the dashboard's global filters shape the number live.

import React from 'react';
import type { DashboardStatConfig } from '../../../../types/database';
import { useDatabaseStore } from '../../../../store/dbms/hardcoded/useDatabaseStore';
import { useViewPages } from '../../../../hooks/useViewPages';
import { cn } from '../../../../utils/cn';

export const STAT_FN_LABEL: Record<DashboardStatConfig['fn'], string> = {
  count: 'Count',
  sum: 'Sum',
  avg: 'Average',
  min: 'Min',
  max: 'Max',
};

function formatStat(value: number, fn: DashboardStatConfig['fn']): string {
  if (fn === 'count') return value.toLocaleString();
  const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  return rounded.toLocaleString();
}

/** Computes the metric over the view's (globally filtered) pages. */
export function StatKpi({ viewId, stat }: Readonly<{ viewId: string; stat: DashboardStatConfig }>) {
  const pages = useViewPages(viewId);
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const view = views[viewId];
  const database = view ? databases[view.databaseId] : null;
  const property = stat.propertyId && database ? database.properties[stat.propertyId] : null;

  let value = pages.length;
  if (stat.fn !== 'count' && stat.propertyId) {
    const numbers = pages
      .map(page => Number(page.properties[stat.propertyId as string]))
      .filter(n => Number.isFinite(n));
    if (numbers.length === 0) value = 0;
    else if (stat.fn === 'sum') value = numbers.reduce((a, b) => a + b, 0);
    else if (stat.fn === 'avg') value = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    else if (stat.fn === 'min') value = Math.min(...numbers);
    else value = Math.max(...numbers);
  }

  const subline = stat.fn === 'count'
    ? `${pages.length === 1 ? 'record' : 'records'}`
    : `${STAT_FN_LABEL[stat.fn]} · ${property?.name ?? '—'}`;

  return (
    <div className={cn("flex-1 min-h-0 flex flex-col items-center justify-center gap-1 px-3 py-2")}>
      <div className={cn("text-4xl font-semibold tabular-nums text-ink leading-none truncate max-w-full")}>
        {formatStat(value, stat.fn)}
      </div>
      <div className={cn("text-xs text-ink-muted truncate max-w-full")}>{subline}</div>
    </div>
  );
}
