/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineDatesMenu.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/07 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/07 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Calendar, Check } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import type { SchemaProperty } from '../../../types/database';
import { cn } from '../../../utils/cn';

interface TimelineDatesMenuProps {
  readonly dateProps: SchemaProperty[];
  readonly startPropId: string | null;
  readonly endPropId: string | null;
  readonly onChangeStart: (propId: string) => void;
  readonly onChangeEnd: (propId: string | 'none') => void;
}

function OptionRow({ label, selected, onSelect }: Readonly<{
  label: string; selected: boolean; onSelect: () => void;
}>) {
  return (
    <button
      type="button" role="menuitemradio" aria-checked={selected} onClick={onSelect}
      className={cn(`flex w-full items-center justify-between gap-2 px-2 py-1.5 rounded text-sm
                  text-ink-body hover:bg-hover-surface transition-colors`)}
    >
      <span className={cn("truncate")}>{label}</span>
      {selected && <Check className={cn("w-3.5 h-3.5 text-accent-text-soft shrink-0")} />}
    </button>
  );
}

/**
 * Picks WHICH date properties drive the timeline — a record can carry several
 * date properties meaning different kinds of time (kickoff, deadline, review…).
 * Choices persist per view (showTimelineBy / timelineEndBy).
 */
export function TimelineDatesMenu({
  dateProps, startPropId, endPropId, onChangeStart, onChangeEnd,
}: TimelineDatesMenuProps) {
  const [open, setOpen] = React.useState(false);
  const startName = dateProps.find(p => p.id === startPropId)?.name ?? 'Date';
  const endName = endPropId ? dateProps.find(p => p.id === endPropId)?.name : null;
  /** Selecting an option applies it AND closes the menu (standard menu UX). */
  const pick = (apply: () => void) => () => { apply(); setOpen(false); };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button" aria-label="Timeline date settings"
          className={cn(`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
                      text-ink-body-light hover:bg-hover-surface3 transition-colors`)}
        >
          <Calendar className={cn("w-3.5 h-3.5")} />
          <span className={cn("truncate max-w-[160px]")}>{startName}{endName ? ` → ${endName}` : ''}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="end" sideOffset={4} collisionPadding={12}
          className={cn("w-56 bg-surface-primary rounded-xl shadow-xl border border-line p-2 z-50")}
        >
          <div role="group" aria-label="Show timeline by">
            <div className={cn("px-2 py-1 text-xs font-semibold text-ink-muted uppercase")}>Show timeline by</div>
            {dateProps.map(p => (
              <OptionRow key={p.id} label={p.name} selected={p.id === startPropId} onSelect={pick(() => onChangeStart(p.id))} />
            ))}
          </div>
          <div role="group" aria-label="End date">
            <div className={cn("px-2 py-1 mt-1 text-xs font-semibold text-ink-muted uppercase border-t border-line-light pt-2")}>End date</div>
            <OptionRow label="None (single dates)" selected={!endPropId} onSelect={pick(() => onChangeEnd('none'))} />
            {dateProps.filter(p => p.id !== startPropId).map(p => (
              <OptionRow key={p.id} label={p.name} selected={p.id === endPropId} onSelect={pick(() => onChangeEnd(p.id))} />
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
