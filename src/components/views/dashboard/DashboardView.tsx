/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardView.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:09 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardView — single renderer ────────────────────────────────────────
// Every dashboard (including legacy `settings.widgets` and zero-config ones) is
// adapted at read time by `layoutFromSettings` and rendered through the
// Notion-model dashboard, so there is one editable dashboard system.

import React, { Suspense } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { cn } from '../../../utils/cn';
import { PaneLoading } from '../../ViewSlideStage';

const DashboardNotionView = React.lazy(() => import('./notion/DashboardNotionView'));

/** Renders the dashboard view through the single Notion-model renderer. */
export function DashboardView() {
  const activeViewId = useActiveViewId();
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  if (!view || !database) return null;

  return (
    <Suspense fallback={
      <PaneLoading>
        <div className={cn("flex-1 flex items-center justify-center text-sm text-ink-muted animate-pulse")}>Loading dashboard…</div>
      </PaneLoading>
    }>
      <DashboardNotionView />
    </Suspense>
  );
}
