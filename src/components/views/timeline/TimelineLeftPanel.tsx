/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineLeftPanel.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Plus } from 'lucide-react';
import type { Page } from '../../../types/database';
import type { TimelineConfig } from './TimelineViewHelpers';
import { LEFT_PANEL_WIDTH } from './timelineTypes';
import { cn } from '../../../utils/cn';

interface TimelineLeftPanelProps {
  readonly displayedPages: Page[];
  readonly config: TimelineConfig;
  readonly hoverRow: string | null;
  readonly getPageTitle: (page: Page) => string;
  readonly openPage: (pageId: string) => void;
  readonly setHoverRow: (id: string | null) => void;
  readonly onAddPage: () => void;
}

export function TimelineLeftPanel({
  displayedPages, config, hoverRow,
  getPageTitle, openPage, setHoverRow, onAddPage,
}: TimelineLeftPanelProps) {
  return (
    <div
      className={cn("border-r border-line shrink-0 flex flex-col bg-surface-secondary")}
      style={{ width: LEFT_PANEL_WIDTH }}
    >
      <div className={cn("h-[52px] border-b border-line flex items-end px-3 pb-2")}>
        <span className={cn("font-medium text-xs text-ink-secondary uppercase tracking-wider")}>
          Pages
        </span>
      </div>

      <div className={cn("flex-1 overflow-y-auto")}>
        {displayedPages.map(page => {
          const title = getPageTitle(page);
          return (
            <button
              type="button"
              key={page.id}
              className={cn(`flex items-center px-3 text-sm border-b border-line-light
                          cursor-pointer transition-colors text-left ${
                hoverRow === page.id ? 'bg-hover-surface2' : 'hover:bg-hover-surface-soft'
              }`)}
              style={{ height: config.rowHeight }}
              onClick={() => openPage(page.id)}
              onMouseEnter={() => setHoverRow(page.id)}
              onMouseLeave={() => setHoverRow(null)}
            >
              {page.icon && (
                <span className={cn("mr-1.5 shrink-0")}>{page.icon}</span>
              )}
              <span className={cn("truncate text-ink")}>
                {title || <span className={cn("text-ink-muted")}>Untitled</span>}
              </span>
            </button>
          );
        })}

        <button
          onClick={onAddPage}
          className={cn(`flex items-center gap-2 w-full px-3 py-2 text-sm text-ink-muted
                     hover:text-hover-text hover:bg-hover-surface2 transition-colors`)}
        >
          <Plus className={cn("w-4 h-4")} /> New
        </button>
      </div>
    </div>
  );
}
