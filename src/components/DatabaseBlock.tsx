/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DatabaseBlock.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:12 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 02:43:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { DatabaseScopeProvider } from '../hooks/useDatabaseScope';
import { TopBar } from './TopBar';
import { DatabaseView } from './DatabaseView';
import { Plus, FileText } from 'lucide-react';
import { cn } from '../utils/cn';

/** Props for {@link DatabaseBlock}. */
export interface DatabaseBlockProps {
  /** Which database to show. If omitted, uses the database of the global activeViewId. */
  databaseId?: string;
  /** Initial view to show (only used in inline mode). */
  initialViewId?: string;
  /** full = main app, fills screen. inline = embedded in page content. */
  mode?: 'full' | 'inline';
}

/** Renders a complete database experience (TopBar + view body) in full-page or inline mode. */
export function DatabaseBlock({
  databaseId,
  initialViewId,
  mode = 'full',
}: Readonly<DatabaseBlockProps>) {
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const globalActiveViewId = useDatabaseStore(s => s.activeViewId);

  const [localViewId, setLocalViewId] = useState(initialViewId || '');

  // Figure out the effective viewId
  const effectiveViewId = mode === 'inline' ? localViewId : globalActiveViewId;
  const view = effectiveViewId ? views[effectiveViewId] : null;

  // For inline mode with a databaseId: if the localViewId is stale, pick first view
  const dbViews = useMemo(() => {
    const targetDbId = databaseId || view?.databaseId;
    if (!targetDbId) return [];
    return Object.values(views).filter(v => v.databaseId === targetDbId);
  }, [views, databaseId, view?.databaseId]);

  // Auto-fix stale local viewId
  const resolvedViewId = useMemo(() => {
    if (mode === 'full') return globalActiveViewId;
    if (localViewId && views[localViewId]) return localViewId;
    return dbViews[0]?.id ?? '';
  }, [mode, globalActiveViewId, localViewId, views, dbViews]);

  const resolvedView = resolvedViewId ? views[resolvedViewId] : null;
  const database = resolvedView ? databases[resolvedView.databaseId] : null;

  if (!database || !resolvedView) {
    return (
      <div className={cn(mode === 'inline'
        ? 'my-3 border border-line rounded-xl p-8 text-center bg-surface-primary'
        : 'flex-1 flex items-center justify-center p-8')}>
        <div className={cn("text-center text-ink-muted max-w-sm")}>
          <FileText className={cn("w-12 h-12 mx-auto mb-3 text-ink-disabled")} />
          <h3 className={cn("text-lg font-semibold text-ink-body-light mb-2")}>No database</h3>
          <p className={cn("text-sm")}>Select a database and view to get started.</p>
        </div>
      </div>
    );
  }

  const handleViewChange = mode === 'inline' ? setLocalViewId : undefined;

  if (mode === 'inline') {
    return (
      <DatabaseScopeProvider value={resolvedViewId}>
        <div className={cn("my-3 border border-line rounded-xl overflow-hidden bg-surface-primary shadow-sm")}>
          <TopBar onViewChange={handleViewChange} />
          <div className={cn("max-h-[500px] overflow-auto")}>
            <DatabaseView viewId={resolvedViewId ?? undefined} compact />
          </div>
          <InlineFooter databaseId={database.id} />
        </div>
      </DatabaseScopeProvider>
    );
  }

  // Full-page mode — identical to current App layout
  return (
    <div className={cn("flex-1 flex flex-col min-h-0")}>
      <TopBar />
      <DatabaseView />
    </div>
  );
}

function InlineFooter({ databaseId }: Readonly<{ databaseId: string }>) {
  const addPage = useDatabaseStore(s => s.addPage);
  const pages = useDatabaseStore(s => s.pages);
  const count = Object.values(pages).filter(p => p.databaseId === databaseId).length;

  return (
    <>
      <button
        onClick={() => addPage(databaseId)}
        className={cn("w-full flex items-center gap-2 px-4 py-2 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface transition-colors border-t border-line-light")}
      >
        <Plus className={cn("w-4 h-4")} />
        <span>New</span>
      </button>
      <div className={cn("px-4 py-1.5 border-t border-line-light bg-surface-secondary-soft text-xs text-ink-muted flex items-center justify-between")}>
        <span>{count} {count === 1 ? 'row' : 'rows'}</span>
      </div>
    </>
  );
}
