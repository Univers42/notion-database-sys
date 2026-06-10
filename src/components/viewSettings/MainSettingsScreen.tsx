/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MainSettingsScreen.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Home screen of the ViewSettingsPanel (non-chart views): identity row +
 * the settings menu. Extracted from ViewSettingsPanel so the panel stays a
 * pure screen router under the 200-line budget.
 */

import React from 'react';
import {
  EyeIcon, FilterIcon, SortIcon, ConditionalColorIcon,
  CopyLinkIcon, SourceIcon, LightningIcon, CollectionIcon, LockIcon,
  ListIcon,
} from '../ui/Icons';
import {
  SettingsRow, SettingsHeader, SettingsSectionLabel,
} from '../ui/MenuPrimitives';
import { ViewIdentityRow } from './SubComponents';
import type { PanelScreen } from './constants';
import { cn } from '../../utils/cn';

export interface MainSettingsScreenProps {
  identityProps: React.ComponentProps<typeof ViewIdentityRow>;
  layoutLabel: string;
  layoutIcon: React.ReactNode;
  visibleCount: number;
  sortCount: number;
  databaseName: string;
  setScreen: (screen: PanelScreen) => void;
  onClose: () => void;
}

/** Main (non-chart) settings menu of the view settings panel. */
export function MainSettingsScreen({
  identityProps, layoutLabel, layoutIcon, visibleCount, sortCount,
  databaseName, setScreen, onClose,
}: Readonly<MainSettingsScreenProps>) {
  return (
    <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
      <SettingsHeader title="View settings" onClose={onClose} />
      <div className={cn('flex-1 overflow-auto')} style={{ minHeight: 0 }}>
        <div className={cn('flex flex-col gap-px')}>
          <ViewIdentityRow {...identityProps} />
          <div className={cn('flex flex-col gap-px px-2 py-1')}>
            <SettingsRow icon={layoutIcon} label="Layout" value={layoutLabel} onClick={() => setScreen('layout')} />
            <SettingsRow icon={<EyeIcon />} label="Property visibility" value={String(visibleCount)} onClick={() => setScreen('propertyVisibility')} />
            <SettingsRow icon={<FilterIcon />} label="Filter" onClick={() => setScreen('filter')} />
            <SettingsRow icon={<SortIcon />} label="Sort" value={sortCount > 0 ? String(sortCount) : undefined} onClick={() => setScreen('sort')} />
            <SettingsRow icon={<ConditionalColorIcon />} label="Conditional color" onClick={() => {}} />
            <SettingsRow icon={<CopyLinkIcon className={cn('w-5 h-5')} />} label="Copy link to view" showChevron={false} onClick={() => {}} />
          </div>
          <SettingsSectionLabel>Data source settings</SettingsSectionLabel>
          <div className={cn('flex flex-col gap-px px-2 pb-2')}>
            <SettingsRow icon={<SourceIcon />} label="Source" value={databaseName} onClick={() => setScreen('source')} />
            <SettingsRow icon={<ListIcon className={cn('w-5 h-5')} />} label="Edit properties" onClick={() => {}} />
            <SettingsRow icon={<LightningIcon />} label="Automations" onClick={() => {}} />
          </div>
          <SettingsSectionLabel>&nbsp;</SettingsSectionLabel>
          <div className={cn('flex flex-col gap-px px-2 pb-2')}>
            <SettingsRow icon={<CollectionIcon />} label="Manage data sources" onClick={() => {}} />
            <SettingsRow icon={<LockIcon />} label="Lock database" showChevron={false} onClick={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}
