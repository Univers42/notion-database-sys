/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GroupSidebar.tsx                                    :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 14:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 14:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── GroupSidebar — GitHub Projects "Slice by" panel ────────────────────────
// Lists the grouped property's values with counts down the LEFT of the view;
// picking one slices the view to that group (useViewPages applies the slice).
// "All" restores the full set. Selection is session-local by design.

import React from 'react';
import { Layers } from 'lucide-react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useGroupSliceStore } from '../../../hooks/useViewGrouping';
import { cn } from '../../../utils/cn';

const ROW = 'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors';

export function GroupSidebar({ viewId }: Readonly<{ viewId: string }>) {
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  useDatabaseStore(s => s.pages);
  const getGroupedPages = useDatabaseStore(s => s.getGroupedPages);
  const slice = useGroupSliceStore(s => s.slices[viewId] ?? null);
  const setSlice = useGroupSliceStore(s => s.setSlice);

  const view = views[viewId];
  const database = view ? databases[view.databaseId] : null;
  if (!view?.grouping || !database) return null;
  const groups = getGroupedPages(viewId);
  const total = groups.reduce((n, g) => n + g.pages.length, 0);
  const propName = database.properties[view.grouping.propertyId]?.name ?? 'Group';

  return (
    <nav aria-label="Groups" data-testid="group-slice-sidebar"
      className={cn('w-48 shrink-0 border-r border-line bg-surface-secondary overflow-y-auto p-2 flex flex-col gap-0.5')}>
      <div className={cn('flex items-center gap-1.5 px-2 pb-1.5 pt-0.5 text-xs font-medium text-ink-muted select-none')}>
        <Layers className={cn('w-3.5 h-3.5')} /> {propName}
      </div>
      <button type="button" onClick={() => setSlice(viewId, null)}
        aria-current={slice === null ? 'true' : undefined}
        className={cn(ROW, slice === null ? 'bg-surface-tertiary text-ink font-medium' : 'text-ink-body hover:bg-hover-surface')}>
        <span className={cn('flex-1 truncate')}>All</span>
        <span className={cn('text-xs text-ink-muted tabular-nums')}>{total}</span>
      </button>
      {groups.map(g => (
        <button key={g.groupId} type="button"
          onClick={() => setSlice(viewId, slice === g.groupId ? null : g.groupId)}
          aria-current={slice === g.groupId ? 'true' : undefined}
          className={cn(ROW, slice === g.groupId ? 'bg-surface-tertiary font-medium' : 'hover:bg-hover-surface')}>
          <span className={cn(`px-1.5 py-0.5 rounded text-xs font-medium truncate ${g.groupColor}`)}>{g.groupLabel}</span>
          <span className={cn('ml-auto text-xs text-ink-muted tabular-nums shrink-0')}>{g.pages.length}</span>
        </button>
      ))}
    </nav>
  );
}
