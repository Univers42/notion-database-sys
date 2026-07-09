/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AddWidgetPicker.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── AddWidgetPicker — views from ANY database, numbers, or a new view ──────
// Notion 2026 dashboards mix sources: the picker offers Number/KPI shortcuts,
// this database's views, every other database's views (grouped), and new-view
// layout shortcuts. A search box cuts across all of it.

import React, { useRef, useState } from 'react';
import { Hash, Plus } from 'lucide-react';
import { useOutsideClick } from '../../../../hooks/useOutsideClick';
import { VIEW_META, LAYOUT_ORDER } from '../../../viewSettings/constants';
import type { DashboardStatConfig, SchemaProperty, ViewConfig, ViewType } from '../../../../types/database';
import type { WidgetViewGroup } from './model/dashboardViewOps';
import { cn } from '../../../../utils/cn';

/** New-view layouts offered in the picker (dashboard-in-dashboard excluded). */
const NEW_VIEW_TYPES: ViewType[] = LAYOUT_ORDER.filter(t => t !== 'dashboard');

interface AddWidgetPickerProps {
  hostViews: ViewConfig[];
  otherGroups: WidgetViewGroup[];
  /** Number properties of the host database (Number widget shortcuts). */
  numberProps: SchemaProperty[];
  onPickExisting: (viewId: string) => void;
  onPickStat: (stat: DashboardStatConfig) => void;
  onCreateNew: (type: ViewType) => void;
  onClose: () => void;
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={cn("px-3 py-1.5 text-[11px] font-medium text-ink-secondary select-none")}>{children}</div>;
}

function ViewRow({ view, onPick }: Readonly<{ view: ViewConfig; onPick: () => void }>) {
  return (
    <button type="button" onClick={onPick}
      className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-ink-body hover:bg-hover-surface-soft2 transition-colors")}>
      <span className={cn("w-4 h-4 flex items-center justify-center text-ink-muted shrink-0")}>{VIEW_META[view.type]?.svgIcon}</span>
      <span className={cn("truncate flex-1")}>{view.name}</span>
      <span className={cn("text-[10px] text-ink-disabled shrink-0")}>{VIEW_META[view.type]?.label}</span>
    </button>
  );
}

/** Popover: numbers + existing views (all databases) + "new view" shortcuts. */
export function AddWidgetPicker({
  hostViews, otherGroups, numberProps,
  onPickExisting, onPickStat, onCreateNew, onClose,
}: Readonly<AddWidgetPickerProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  useOutsideClick(ref, true, onClose);

  const q = query.trim().toLowerCase();
  const matches = (label: string) => !q || label.toLowerCase().includes(q);
  const hostFiltered = hostViews.filter(v => matches(v.name));
  const groupsFiltered = otherGroups
    .map(group => ({ ...group, views: group.views.filter(v => matches(v.name) || matches(group.databaseName)) }))
    .filter(group => group.views.length > 0);
  const statEntries: { label: string; stat: DashboardStatConfig }[] = [
    { label: 'Count of records', stat: { fn: 'count' } satisfies DashboardStatConfig },
    ...numberProps.slice(0, 2).flatMap((prop): { label: string; stat: DashboardStatConfig }[] => [
      { label: `Sum of ${prop.name}`, stat: { fn: 'sum', propertyId: prop.id } },
      { label: `Average ${prop.name}`, stat: { fn: 'avg', propertyId: prop.id } },
    ]),
  ].filter(entry => matches(entry.label));
  const newTypes = NEW_VIEW_TYPES.filter(type => matches(VIEW_META[type]?.label ?? type));

  return (
    <div ref={ref} className={cn("odb-pop-in absolute right-0 top-full mt-1 z-30 w-72 max-h-[440px] overflow-y-auto py-1 rounded-lg border border-line bg-surface-primary shadow-lg")}>
      <div className={cn("px-2 pt-1 pb-1.5 sticky top-0 bg-surface-primary")}>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search widgets…"
          aria-label="Search widgets"
          className={cn("w-full px-2 py-1 text-xs bg-surface-secondary rounded-md outline-none text-ink placeholder:text-ink-muted")}
        />
      </div>

      {statEntries.length > 0 && (
        <>
          <SectionLabel>Number</SectionLabel>
          {statEntries.map(entry => (
            <button key={entry.label} type="button" onClick={() => { onPickStat(entry.stat); onClose(); }}
              className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-ink-body hover:bg-hover-surface-soft2 transition-colors")}>
              <Hash className={cn("w-3.5 h-3.5 text-ink-muted shrink-0")} />
              <span className={cn("truncate flex-1")}>{entry.label}</span>
            </button>
          ))}
        </>
      )}

      <SectionLabel>This database</SectionLabel>
      {hostFiltered.length === 0 && (
        <div className={cn("px-3 pb-1 text-xs text-ink-muted")}>{q ? 'No matching views.' : 'No other views in this database yet.'}</div>
      )}
      {hostFiltered.map(view => (
        <ViewRow key={view.id} view={view} onPick={() => { onPickExisting(view.id); onClose(); }} />
      ))}

      {groupsFiltered.map(group => (
        <React.Fragment key={group.databaseId}>
          <SectionLabel>{group.databaseName}</SectionLabel>
          {group.views.map(view => (
            <ViewRow key={view.id} view={view} onPick={() => { onPickExisting(view.id); onClose(); }} />
          ))}
        </React.Fragment>
      ))}

      <div className={cn("mt-1 pt-1 border-t border-line")}>
        <SectionLabel>New view</SectionLabel>
        <div className={cn("grid grid-cols-2 gap-1 px-2 pb-2")}>
          {newTypes.map(type => (
            <button key={type} type="button" onClick={() => { onCreateNew(type); onClose(); }}
              className={cn("flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md text-ink-body hover:bg-hover-surface-soft2 transition-colors")}>
              <span className={cn("w-4 h-4 flex items-center justify-center text-ink-muted shrink-0")}>{VIEW_META[type]?.svgIcon}</span>
              <span className={cn("truncate")}>{VIEW_META[type]?.label}</span>
              <Plus className={cn("w-3 h-3 ml-auto text-ink-disabled shrink-0")} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
