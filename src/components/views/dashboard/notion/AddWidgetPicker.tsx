/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AddWidgetPicker.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── AddWidgetPicker — pick an existing view or create a new one ────────────
// Notion flow: a widget shows an existing database view, or a freshly created
// view of any layout (table/board/chart/…).

import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useOutsideClick } from '../../../../hooks/useOutsideClick';
import { VIEW_META, LAYOUT_ORDER } from '../../../viewSettings/constants';
import type { ViewConfig, ViewType } from '../../../../types/database';
import { cn } from '../../../../utils/cn';

/** New-view layouts offered in the picker (dashboard-in-dashboard excluded). */
const NEW_VIEW_TYPES: ViewType[] = LAYOUT_ORDER.filter(t => t !== 'dashboard');

/** Popover: existing views to embed + "new view" layout shortcuts. */
export function AddWidgetPicker({ views, onPickExisting, onCreateNew, onClose }: Readonly<{
  views: ViewConfig[];
  onPickExisting: (viewId: string) => void;
  onCreateNew: (type: ViewType) => void;
  onClose: () => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, true, onClose);

  return (
    <div ref={ref} className={cn("absolute right-0 top-full mt-1 z-30 w-64 max-h-[420px] overflow-auto py-1 rounded-lg border border-line bg-surface-primary shadow-lg")}>
      <div className={cn("px-3 py-1.5 text-[11px] font-medium text-ink-secondary select-none")}>Existing views</div>
      {views.length === 0 && (
        <div className={cn("px-3 pb-2 text-xs text-ink-muted")}>No other views in this database yet.</div>
      )}
      {views.map(view => (
        <button key={view.id} onClick={() => { onPickExisting(view.id); onClose(); }}
          className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-ink-body hover:bg-hover-surface-soft2 transition-colors")}>
          <span className={cn("w-4 h-4 flex items-center justify-center text-ink-muted shrink-0")}>{VIEW_META[view.type]?.svgIcon}</span>
          <span className={cn("truncate flex-1")}>{view.name}</span>
          <span className={cn("text-[10px] text-ink-disabled shrink-0")}>{VIEW_META[view.type]?.label}</span>
        </button>
      ))}
      <div className={cn("mt-1 pt-1 border-t border-line px-3 py-1.5 text-[11px] font-medium text-ink-secondary select-none")}>New view</div>
      <div className={cn("grid grid-cols-2 gap-1 px-2 pb-2")}>
        {NEW_VIEW_TYPES.map(type => (
          <button key={type} onClick={() => { onCreateNew(type); onClose(); }}
            className={cn("flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md text-ink-body hover:bg-hover-surface-soft2 transition-colors")}>
            <span className={cn("w-4 h-4 flex items-center justify-center text-ink-muted shrink-0")}>{VIEW_META[type]?.svgIcon}</span>
            <span className={cn("truncate")}>{VIEW_META[type]?.label}</span>
            <Plus className={cn("w-3 h-3 ml-auto text-ink-disabled shrink-0")} />
          </button>
        ))}
      </div>
    </div>
  );
}
