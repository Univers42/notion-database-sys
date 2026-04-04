/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineToolbar.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ZoomLevel } from './TimelineViewHelpers';
import { cn } from '../../../utils/cn';

interface TimelineToolbarProps {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly zoomLevel: ZoomLevel;
  readonly navStep: number;
  readonly onOffsetChange: (delta: number) => void;
  readonly onResetOffset: () => void;
  readonly onZoom: (level: ZoomLevel) => void;
}

export function TimelineToolbar({
  startDate, endDate, zoomLevel, navStep,
  onOffsetChange, onResetOffset, onZoom,
}: TimelineToolbarProps) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-2 border-b border-line bg-surface-secondary shrink-0")}>
      <div className={cn("flex items-center gap-2")}>
        <button
          onClick={() => onOffsetChange(-navStep)}
          className={cn("p-1 hover:bg-hover-surface3 rounded text-ink-secondary transition-colors")}
        >
          <ChevronLeft className={cn("w-4 h-4")} />
        </button>
        <button
          onClick={onResetOffset}
          className={cn("px-2 py-1 hover:bg-hover-surface3 rounded text-xs font-medium text-ink-body-light transition-colors")}
        >
          Today
        </button>
        <button
          onClick={() => onOffsetChange(navStep)}
          className={cn("p-1 hover:bg-hover-surface3 rounded text-ink-secondary transition-colors")}
        >
          <ChevronRight className={cn("w-4 h-4")} />
        </button>
        <span className={cn("text-xs font-medium text-ink-secondary ml-2")}>
          {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
        </span>
      </div>

      {/* Zoom toggle */}
      <div className={cn("flex items-center gap-1 bg-surface-muted rounded-md p-0.5")}>
        {(['day', 'week', 'month'] as const).map(level => (
          <button
            key={level}
            onClick={() => onZoom(level)}
            className={cn(`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              zoomLevel === level
                ? 'bg-surface-primary shadow-sm text-ink'
                : 'text-ink-body-light hover:text-hover-text-bolder'
            }`)}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
