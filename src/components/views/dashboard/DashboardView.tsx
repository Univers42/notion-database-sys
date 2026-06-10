/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardView.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:09 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardView — dual-mode dispatch ─────────────────────────────────────
// settings.dashboardRows present → Notion-model renderer (widgets ARE views).
// Otherwise the legacy paths (preset widget cards / auto-detect) render
// unchanged — seeded dashboards keep working with zero migration.

import React, { Suspense } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { useViewPages } from '../../../hooks/useViewPages';
import type { DashboardWidget, Page, SchemaProperty } from '../../../types/database';
import { LayoutDashboard } from 'lucide-react';
import { FormulaAnalyticsDashboard } from './FormulaAnalyticsDashboard';
import { RelationRollupDashboard } from '../relationRollup/RelationRollupDashboard';
import { AutoDetectDashboard, useComputedData } from './DashboardAutoDetect';
import { renderWidget } from '.';
import type { ComputedData } from '.';
import { cn } from '../../../utils/cn';

const DashboardNotionView = React.lazy(() => import('./notion/DashboardNotionView'));

function WidgetGrid({ widgets, pages, propsMap, computedData, openPage, getPageTitle }: Readonly<{
  widgets: DashboardWidget[];
  pages: { id: string; icon?: string; updatedAt: string; properties: Record<string, unknown> }[];
  propsMap: Record<string, SchemaProperty>;
  computedData: ComputedData;
  openPage: (id: string) => void;
  getPageTitle: (page: { properties: Record<string, unknown> }) => string;
}>) {
  return (
    <div className={cn("flex-1 overflow-auto p-6 bg-surface-secondary")}>
      <div className={cn("max-w-7xl mx-auto")}>
        <div className={cn("grid grid-cols-4 gap-4 auto-rows-min")}>
          {widgets.map((widget, idx) => (
            <div key={widget.id}
              className={cn("bg-surface-primary rounded-xl border border-line overflow-hidden")}
              style={{ gridColumn: `span ${Math.min(widget.width, 4)}`, minHeight: widget.height === 2 ? '320px' : '140px' }}>
              {renderWidget(widget, idx, pages, propsMap, computedData, openPage, getPageTitle)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Renders the dashboard view: Notion-model, preset widgets, or auto-detect. */
export function DashboardView() {
  const activeViewId = useActiveViewId();
  const { views, databases, openPage, getPageTitle, updateViewSettings } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const pages = useViewPages(view?.id);
  const allProps = database ? Object.values(database.properties) : [];
  const propsMap = database ? database.properties : {};
  // Hook must be called unconditionally (React rules of hooks)
  const computedData = useComputedData(pages, database);

  if (view?.settings?.formulaAnalytics) return <FormulaAnalyticsDashboard />;
  if (view?.settings?.relationAnalytics) return <RelationRollupDashboard />;
  if (!view || !database) return null;

  if (view.settings?.dashboardRows) {
    return (
      <Suspense fallback={
        <div className={cn("flex-1 flex items-center justify-center text-sm text-ink-muted animate-pulse")}>Loading dashboard…</div>
      }>
        <DashboardNotionView />
      </Suspense>
    );
  }

  const customizeCta = (
    <button
      onClick={() => updateViewSettings(view.id, { dashboardRows: [], dashboardWidgets: [] })}
      title="Switch to the customizable widget dashboard"
      className={cn("absolute top-3 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-line bg-surface-primary text-ink-muted hover:text-ink hover:bg-hover-surface transition-colors shadow-sm")}>
      <LayoutDashboard className={cn("w-3.5 h-3.5")} /> Customize layout
    </button>
  );

  const widgets: DashboardWidget[] = view.settings?.widgets || [];
  const titleFn = (page: { properties: Record<string, unknown> }) =>
    getPageTitle(page as Page);

  return (
    <div className={cn("relative flex-1 flex flex-col min-h-0")}>
      {customizeCta}
      {widgets.length > 0 ? (
        <WidgetGrid widgets={widgets} pages={pages} propsMap={propsMap}
          computedData={computedData} openPage={openPage} getPageTitle={titleFn} />
      ) : (
        <AutoDetectDashboard pages={pages} allProps={allProps}
          computedData={computedData} openPage={openPage} getPageTitle={titleFn} />
      )}
    </div>
  );
}
