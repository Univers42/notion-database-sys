/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DatabaseView.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:15 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:39:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// DatabaseView — unified entry point for rendering any database view
// ═══════════════════════════════════════════════════════════════════════════════
//
// This component is the single entry point for rendering database views.
// It supports two modes:
//   1. Full-page: Uses the global activeViewId from the store (default)
//   2. Inline/embedded: Receives a viewId prop and scopes it via
//      DatabaseScopeProvider so child views read the overridden viewId
//      WITHOUT mutating global state.
//
// All view components (Table, Board, Calendar, etc.) are rendered through
// this component, ensuring consistent behavior between inline and full-page.
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import { DatabaseScopeProvider } from '../hooks/useDatabaseScope';
import { ErrorBoundary } from './ErrorBoundary';
import type { ViewType } from '../types/database';

// View component imports
import { TableView } from './views/TableView';
import { BoardView } from './views/BoardView';
import { CalendarView } from './views/CalendarView';
import { TimelineView } from './views/TimelineView';
import { ListView } from './views/ListView';
import { GalleryView } from './views/GalleryView';
import { ChartView } from './views/ChartView';
import { DashboardView } from './views/DashboardView';
import { FeedView } from './views/FeedView';
import { MapView } from './views/MapView';
import { FileText } from 'lucide-react';

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

export interface DatabaseViewProps {
  /** Override: render this specific view instead of the global active one */
  viewId?: string;
  /** Compact mode for inline embeds (limits height, hides some chrome) */
  compact?: boolean;
}

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
    <div className={compact ? 'database-view-compact' : 'flex-1 flex flex-col min-h-0'}>
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
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center text-ink-muted max-w-sm">
        <FileText className="w-12 h-12 mx-auto mb-3 text-ink-disabled" />
        <h3 className="text-lg font-semibold text-ink-body-light mb-2">No view selected</h3>
        <p className="text-sm">Select a database and view from the sidebar to get started.</p>
      </div>
    </div>
  );
}
