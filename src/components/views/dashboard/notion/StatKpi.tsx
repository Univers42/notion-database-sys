// ─── StatKpi — the Number widget body (Notion 2026 dashboards) ───────────────
// A glanceable metric over the widget's backing view: count of records or
// sum/avg/min/max of a number-valued property (number, formula, rollup). Built on useViewPages, so the view's
// own filters AND the dashboard's global filters shape the number live.
// Laid out as a KPI tile — icon chip, number, label, provenance — so the
// number says what it counts and out of what.

import React from 'react';
import type { DashboardStatConfig } from '../../../../types/database';
import { useDatabaseStore } from '../../../../store/dbms/hardcoded/useDatabaseStore';
import { useViewPages } from '../../../../hooks/useViewPages';
import { StatIconBadge, STAT_LOOK } from '../StatComponents';
import { aggregate, formatKpi, kpiProvenance, numericValues, STAT_FN_KIND } from './model/kpiModel';
import { cn } from '../../../../utils/cn';

export { STAT_FN_LABEL } from './model/kpiModel';

/** Live records of a database (archived and template pages excluded). */
function useDatabaseRecordCount(databaseId: string | undefined): number {
  return useDatabaseStore(s => {
    if (!databaseId) return 0;
    let n = 0;
    for (const page of Object.values(s.pages)) {
      if (page.databaseId === databaseId && !page.archived && !page.isTemplate) n++;
    }
    return n;
  });
}

/** Computes the metric over the view's (globally filtered) pages. */
export function StatKpi({ viewId, stat, label }: Readonly<{
  viewId: string; stat: DashboardStatConfig; label?: string;
}>) {
  const pages = useViewPages(viewId);
  const view = useDatabaseStore(s => s.views[viewId]);
  const database = useDatabaseStore(s => (view ? s.databases[view.databaseId] : undefined));
  const getCellValue = useDatabaseStore(s => s.getCellValue);
  const total = useDatabaseRecordCount(view?.databaseId);
  const property = stat.propertyId && database ? database.properties[stat.propertyId] : null;

  const value = stat.fn === 'count' || !stat.propertyId
    ? pages.length
    : aggregate(stat.fn, numericValues(pages.map(page => getCellValue(page, stat.propertyId as string))));
  const provenance = kpiProvenance({ fn: stat.fn, matched: pages.length, total, propertyName: property?.name });
  const look = STAT_LOOK[STAT_FN_KIND[stat.fn]];
  const shown = formatKpi(value);
  // A bold digit is ~0.6em wide: cap the size so every character fits the
  // tile's width instead of truncating the figure.
  const widthCap = { '--kpi-w': `${Math.round(160 / Math.max(shown.length, 1))}cqw` } as React.CSSProperties;

  // The card is a size container: a stacked half-height card (~46px body) or
  // a narrow column (~80px) clipped fixed text. The number scales to its own
  // box; the chip leaves narrow tiles and the provenance leaves short ones.
  // Caveat: the 0.6em digit width is an estimate — a figure of wide glyphs
  // ("88.8M") can still lose a pixel or two to the truncate.
  return (
    <div className={cn("flex-1 min-h-0 flex items-center gap-3 px-4 py-2 [container-type:size]")}>
      <div className={cn("shrink-0 [@container(max-width:150px)]:hidden [@container(max-height:56px)]:hidden")}>
        <StatIconBadge color={look.color}>{look.icon}</StatIconBadge>
      </div>
      <div className={cn("min-w-0 flex-1 [@container(max-width:150px)]:text-center")} title={provenance}>
        <div style={widthCap} className={cn("text-[min(1.875rem,40cqh,var(--kpi-w))] [@container(max-height:64px)]:text-[min(1.5rem,60cqh,var(--kpi-w))] font-bold tabular-nums text-ink leading-none truncate")}>
          {shown}
        </div>
        {label && <div className={cn("mt-1 text-xs text-ink-secondary truncate [@container(max-height:40px)]:hidden")}>{label}</div>}
        <div className={cn("mt-0.5 text-[11px] text-ink-muted truncate [@container(max-height:80px)]:hidden")}>{provenance}</div>
      </div>
    </div>
  );
}
