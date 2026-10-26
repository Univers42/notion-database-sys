/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SortSettingsSubpanel.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { X } from 'lucide-react';
import type { SchemaProperty, Sort } from '../../types/database';
import { SortRules } from './SortRules';
import { cn } from '../../utils/cn';

/** CSS class overrides for SortSettingsSubpanel sub-elements. */
export type SortSettingsSubpanelSlots = {
  root: string;
  header: string;
  backButton: string;
  title: string;
  closeButton: string;
  body: string;
};

/** The Sort screen of View settings: a back arrow, then the view's sort rules. */
export function SortSettingsSubpanel({ viewId, properties, sorts, onBack, onClose, slots }: Readonly<{
  viewId: string;
  properties: Record<string, SchemaProperty>;
  sorts: Sort[];
  onBack: () => void;
  onClose: () => void;
  slots?: Partial<SortSettingsSubpanelSlots>;
}>) {
  return (
    <div className={cn("flex flex-col", slots?.root)} style={{ minWidth: 290, maxHeight: '80vh' }}>
      <div className={cn("flex items-center px-3 pt-3.5 pb-1.5 h-[42px] shrink-0", slots?.header)}>
        <button type="button" onClick={onBack} aria-label="Back"
          className={cn("w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 mr-2 text-ink-secondary transition-colors", slots?.backButton)}>
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden>
            <path d="M2.16 8.206q.046.13.148.236l4.32 4.32a.625.625 0 0 0 .884-.884L4.259 8.625h8.991a.625.625 0 1 0 0-1.25H4.259l3.253-3.253a.625.625 0 1 0-.884-.884l-4.32 4.32a.62.62 0 0 0-.148.648" fill="currentColor" />
          </svg>
        </button>
        <span className={cn("flex-1 font-semibold text-sm truncate", slots?.title)}>Sort</span>
        <button type="button" onClick={onClose} aria-label="Close"
          className={cn("w-6 h-6 flex items-center justify-center rounded-full bg-surface-tertiary hover:bg-hover-surface3 text-ink-muted transition-colors", slots?.closeButton)}>
          <X className={cn("w-3.5 h-3.5")} />
        </button>
      </div>
      <div className={cn("overflow-y-auto flex-1 min-h-0", slots?.body)}>
        <SortRules viewId={viewId} properties={properties} sorts={sorts} onEmptyClose={onBack} pickerTitle="" />
      </div>
    </div>
  );
}
