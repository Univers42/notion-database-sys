/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardWidgetFrame.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardWidgetFrame — one widget card: chrome + embedded view ─────────
// The body is literally <DatabaseView viewId={...} compact /> — the widget IS
// a database view (Notion model), scoped via DatabaseScopeProvider.

import React, { useRef, useState } from 'react';
import { MoreHorizontal, Settings2, Copy, Trash2, ArrowLeft, ArrowRight, CornerDownRight } from 'lucide-react';
import { DatabaseView } from '../../../DatabaseView';
import { ViewSettingsPanel } from '../../../ViewSettingsPanel';
import { DatabaseScopeProvider } from '../../../../hooks/useDatabaseScope';
import { ErrorBoundary } from '../../../ErrorBoundary';
import { useOutsideClick } from '../../../../hooks/useOutsideClick';
import { VIEW_META } from '../../../viewSettings/constants';
import type { ViewConfig, DashboardViewWidget } from '../../../../types/database';
import { cn } from '../../../../utils/cn';

export interface WidgetActions {
  onConfigureOpen?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: 'left' | 'right' | 'newRowBelow') => void;
}

/** Card chrome around an embedded view; edit mode reveals the action menu. */
export function DashboardWidgetFrame({ widget, view, editMode, actions }: Readonly<{
  widget: DashboardViewWidget;
  view: ViewConfig | null;
  editMode: boolean;
  actions: WidgetActions;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<HTMLDivElement>(null);
  useOutsideClick(menuRef, menuOpen, () => setMenuOpen(false));
  useOutsideClick(configRef, configOpen, () => setConfigOpen(false));

  if (!view) {
    return (
      <div className={cn("h-full flex items-center justify-center rounded-xl border border-dashed border-line text-xs text-ink-muted")}>
        This widget's view was deleted.
        {editMode && (
          <button onClick={actions.onDelete} className={cn("ml-2 underline hover:text-ink")}>Remove widget</button>
        )}
      </div>
    );
  }
  const meta = VIEW_META[view.type];

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button onClick={() => { setMenuOpen(false); onClick(); }}
      className={cn(`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-hover-surface-soft2 ${danger ? 'text-danger-text' : 'text-ink-body'}`)}>
      <span className={cn("w-4 h-4 flex items-center justify-center shrink-0")}>{icon}</span>{label}
    </button>
  );

  return (
    <div className={cn("h-full min-w-0 flex flex-col rounded-xl border border-line bg-surface-primary overflow-hidden")}>
      <div className={cn("flex items-center gap-1.5 px-3 py-1.5 border-b border-line shrink-0")}>
        <span className={cn("w-4 h-4 flex items-center justify-center text-ink-muted shrink-0")}>{meta?.svgIcon}</span>
        <span className={cn("text-xs font-medium text-ink truncate")}>{widget.title ?? view.name}</span>
        {editMode && (
          <div ref={menuRef} className={cn("relative ml-auto shrink-0")}>
            <button onClick={() => setMenuOpen(o => !o)} aria-label="Widget actions"
              className={cn("p-1 rounded-md hover:bg-hover-surface text-ink-muted")}>
              <MoreHorizontal className={cn("w-3.5 h-3.5")} />
            </button>
            {menuOpen && (
              <div className={cn("absolute right-0 top-full mt-1 z-30 w-44 py-1 rounded-lg border border-line bg-surface-primary shadow-lg")}>
                {menuItem(<Settings2 className={cn("w-3.5 h-3.5")} />, 'Configure view', () => setConfigOpen(true))}
                {menuItem(<Copy className={cn("w-3.5 h-3.5")} />, 'Duplicate', actions.onDuplicate)}
                {menuItem(<ArrowLeft className={cn("w-3.5 h-3.5")} />, 'Move left', () => actions.onMove('left'))}
                {menuItem(<ArrowRight className={cn("w-3.5 h-3.5")} />, 'Move right', () => actions.onMove('right'))}
                {menuItem(<CornerDownRight className={cn("w-3.5 h-3.5")} />, 'Move to new row', () => actions.onMove('newRowBelow'))}
                {menuItem(<Trash2 className={cn("w-3.5 h-3.5")} />, 'Delete widget', actions.onDelete, true)}
              </div>
            )}
          </div>
        )}
      </div>
      <div className={cn("relative flex-1 min-h-0 flex flex-col overflow-auto")}>
        <ErrorBoundary>
          <DatabaseView viewId={widget.viewId} compact />
        </ErrorBoundary>
        {configOpen && (
          <div ref={configRef} className={cn("absolute top-1 right-1 z-30 max-h-[95%] overflow-auto rounded-xl border border-line bg-surface-primary shadow-xl")}>
            <DatabaseScopeProvider value={widget.viewId}>
              <ViewSettingsPanel onClose={() => setConfigOpen(false)} />
            </DatabaseScopeProvider>
          </div>
        )}
      </div>
    </div>
  );
}
