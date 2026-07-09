/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DatabaseView.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:15 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useMemo } from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId, DatabaseScopeProvider } from '../hooks/useDatabaseScope';
import { ErrorBoundary } from './ErrorBoundary';
import { ViewSlideStage } from './ViewSlideStage';
import { GroupSidebar } from './views/shared/GroupSidebar';
import { sidebarGroupingActive } from '../hooks/useViewGrouping';
import { orderedDatabaseViews } from '../lib/viewOrder';
import type { ViewType } from '../types/database';

import { TableView } from './views/table/TableView';
import { BoardView } from './views/board/BoardView';
import { CalendarView } from './views/calendar/CalendarView';
import { TimelineView } from './views/timeline/TimelineView';
import { useDateReminders } from './views/timeline/useDateReminders';
import { ListView } from './views/list/ListView';
import { GalleryView } from './views/gallery/GalleryView';
import { ChartView } from './views/chart/ChartView';
import { DashboardView } from './views/dashboard/DashboardView';
import { FeedView } from './views/feed/FeedView';
import { MapView } from './views/map/MapView';
import { FileText } from 'lucide-react';
import { cn } from '../utils/cn';

const VIEW_COMPONENTS: Record<ViewType, React.ComponentType> = {
  table: TableView,
  board: BoardView,
  calendar: CalendarView,
  timeline: TimelineView,
  list: ListView,
  gallery: GalleryView,
  chart: ChartView,
  dashboard: DashboardView,
  feed: FeedView,
  map: MapView,
};

/** Props for {@link DatabaseView}. */
export interface DatabaseViewProps {
  /** Override: render this specific view instead of the global active one */
  viewId?: string;
  /** Compact mode for inline embeds (limits height, hides some chrome) */
  compact?: boolean;
}

/** Resolves the active view and renders the appropriate view component (Table, Board, etc.). */
export function DatabaseView({ viewId, compact = false }: Readonly<DatabaseViewProps>) {
  // If a viewId override is provided, scope it via context.
  // Otherwise, use the global activeViewId (from context or store).
  const globalViewId = useActiveViewId();
  const resolvedViewId = viewId ?? globalViewId;
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  // Best-effort in-session reminders for date properties (panel "Remind").
  useDateReminders();

  const view = resolvedViewId ? views[resolvedViewId] : null;

  // Position of the active view among its database's views (same order the
  // header tabs render in) — the slide direction is the sign of its change.
  const orderIndex = useMemo(() => {
    if (!view) return 0;
    const ids = orderedDatabaseViews(views, view.databaseId, databases[view.databaseId]?.viewOrder).map(v => v.id);
    const i = ids.indexOf(resolvedViewId ?? '');
    return i < 0 ? 0 : i;
  }, [views, databases, view, resolvedViewId]);

  if (!view || !VIEW_COMPONENTS[view.type]) {
    return <EmptyDatabaseState />;
  }

  // Renders one view's body, scoped so an outgoing pane keeps showing its own
  // view while a new one slides in.
  const renderPane = (paneViewId: string): React.ReactNode => {
    const paneView = views[paneViewId];
    const PaneComponent = paneView ? VIEW_COMPONENTS[paneView.type] : null;
    if (!PaneComponent) return null;
    const body = (
      <DatabaseScopeProvider value={paneViewId}>
        <ErrorBoundary>
          <PaneComponent />
        </ErrorBoundary>
      </DatabaseScopeProvider>
    );
    // GitHub-mode grouping: the slice panel rides LEFT of the view body;
    // useViewPages applies the selected slice inside the view itself.
    if (sidebarGroupingActive(paneView)) {
      return (
        <div className={cn('flex-1 flex min-h-0 h-full')}>
          <GroupSidebar viewId={paneViewId} />
          <div className={cn('flex-1 min-w-0 flex flex-col min-h-0')}>{body}</div>
        </div>
      );
    }
    return body;
  };

  // Inline/compact embeds flow with the page (no fixed height) — the absolute
  // slide slots need a definite height, so those switch instantly.
  if (compact) {
    return <div className={cn('database-view-compact')}>{renderPane(resolvedViewId ?? '')}</div>;
  }

  return <ViewSlideStage viewId={resolvedViewId ?? ''} orderIndex={orderIndex} renderPane={renderPane} />;
}

function EmptyDatabaseState() {
  return (
    <div className={cn("flex-1 flex items-center justify-center p-8")}>
      <div className={cn("text-center text-ink-muted max-w-sm")}>
        <FileText className={cn("w-12 h-12 mx-auto mb-3 text-ink-disabled")} />
        <h3 className={cn("text-lg font-semibold text-ink-body-light mb-2")}>No view selected</h3>
        <p className={cn("text-sm")}>Select a database and view from the sidebar to get started.</p>
      </div>
    </div>
  );
}
