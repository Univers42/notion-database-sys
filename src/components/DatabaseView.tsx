/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DatabaseView.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:15 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import { DatabaseScopeProvider } from '../hooks/useDatabaseScope';
import { ErrorBoundary } from './ErrorBoundary';
import type { ViewType } from '../types/database';

import { TableView } from './views/table/TableView';
import { BoardView } from './views/board/BoardView';
import { CalendarView } from './views/calendar/CalendarView';
import { TimelineView } from './views/timeline/TimelineView';
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

  const view = resolvedViewId ? views[resolvedViewId] : null;
  const ViewComponent = view ? VIEW_COMPONENTS[view.type] : null;

  if (!ViewComponent) {
    return <EmptyDatabaseState />;
  }

  const content = (
    <div className={cn(compact ? 'database-view-compact' : 'flex-1 flex flex-col min-h-0')}>
      <ErrorBoundary>
        <ViewComponent />
      </ErrorBoundary>
    </div>
  );

  // Wrap in scope provider if we're overriding the viewId
  if (viewId) {
    return (
      <DatabaseScopeProvider value={viewId}>
        {content}
      </DatabaseScopeProvider>
    );
  }

  return content;
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
