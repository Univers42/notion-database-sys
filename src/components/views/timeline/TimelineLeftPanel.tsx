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
import { PropIcon } from '../../../constants/propertyIcons';
import { cn } from '../../../utils/cn';

interface TimelineLeftPanelProps {
  readonly displayedPages: Page[];
  readonly config: TimelineConfig;
  readonly hoverRow: string | null;
  readonly getPageTitle: (page: Page) => string;
  readonly openPage: (pageId: string) => void;
  readonly setHoverRow: (id: string | null) => void;
  /** Absent → the records are read-only: no New row. */
  readonly onAddPage?: () => void;
  /** The title property's name — the panel's column header. */
  readonly titleLabel: string;
}

export function TimelineLeftPanel({
  displayedPages, config, hoverRow,
  getPageTitle, openPage, setHoverRow, onAddPage, titleLabel,
}: TimelineLeftPanelProps) {
  return (
    <div
      className={cn("border-r border-line shrink-0 flex flex-col bg-surface-primary")}
      style={{ width: LEFT_PANEL_WIDTH }}
    >
      {/* 51px = the chart header: 24px months + 26px days + its 1px border. */}
      <div className={cn("h-[51px] border-b border-line flex items-end px-3 pb-2")}>
        <span className={cn("flex items-center gap-1.5 text-xs text-ink-muted")}>
          <PropIcon type="title" className={cn("w-3.5 h-3.5")} />
          {titleLabel}
        </span>
      </div>

      <div className={cn("flex-1 overflow-y-auto")}>
        {displayedPages.map(page => {
          const title = getPageTitle(page);
          return (
            <button
              type="button"
              key={page.id}
              className={cn(`flex w-full items-center px-3 text-sm border-b border-line-light
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

        {onAddPage && <button
          onClick={onAddPage}
          className={cn(`flex items-center gap-2 w-full px-3 py-2 text-sm text-ink-muted
                     hover:text-hover-text hover:bg-hover-surface2 transition-colors`)}
        >
          <Plus className={cn("w-4 h-4")} /> New
        </button>}
      </div>
    </div>
  );
}
