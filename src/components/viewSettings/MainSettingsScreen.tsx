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
import { useDatabaseStore, useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import {
  EyeIcon, FilterIcon, SortIcon, ConditionalColorIcon,
  CopyLinkIcon, SourceIcon, LightningIcon, CollectionIcon, LockIcon,
  ListIcon,
} from '../ui/Icons';
import {
  SettingsRow, SettingsHeader, SettingsSectionLabel,
} from '../ui/MenuPrimitives';
import { ViewIdentityRow } from './SubComponents';
import { copyViewLink } from '../../lib/viewLink';
import { updateDatabaseMeta } from '../../store/sources/dbMetaPersistence';
import type { PanelScreen } from './constants';
import { cn } from '../../utils/cn';

export interface MainSettingsScreenProps {
  identityProps: React.ComponentProps<typeof ViewIdentityRow>;
  layoutLabel: string;
  layoutIcon: React.ReactNode;
  viewId: string;
  databaseId: string;
  visibleCount: number;
  sortCount: number;
  databaseName: string;
  setScreen: (screen: PanelScreen) => void;
  onClose: () => void;
}

/** Main (non-chart) settings menu of the view settings panel. */
export function MainSettingsScreen({
  identityProps, layoutLabel, layoutIcon, viewId, databaseId,
  visibleCount, sortCount, databaseName, setScreen, onClose,
}: Readonly<MainSettingsScreenProps>) {
  const { databases } = useDatabaseStore();
  const storeApi = useStoreApi();
  const [copied, setCopied] = React.useState(false);
  const locked = Boolean(databases[databaseId]?.locked);

  const copyLink = () => {
    void copyViewLink(viewId).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  const toggleLock = () => updateDatabaseMeta(storeApi, databaseId, { locked: !locked });

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
            <SettingsRow icon={<ConditionalColorIcon />} label="Conditional color" onClick={() => setScreen('conditionalColor')} />
            <SettingsRow icon={<CopyLinkIcon className={cn('w-5 h-5')} />} label={copied ? 'Copied!' : 'Copy link to view'} showChevron={false} onClick={copyLink} />
          </div>
          <SettingsSectionLabel>Data source settings</SettingsSectionLabel>
          <div className={cn('flex flex-col gap-px px-2 pb-2')}>
            <SettingsRow icon={<SourceIcon />} label="Source" value={databaseName} onClick={() => setScreen('source')} />
            <SettingsRow icon={<ListIcon className={cn('w-5 h-5')} />} label="Edit properties" onClick={() => setScreen('editProperties')} />
            <SettingsRow icon={<LightningIcon />} label="Automations" onClick={() => setScreen('automations')} />
          </div>
          <SettingsSectionLabel>&nbsp;</SettingsSectionLabel>
          <div className={cn('flex flex-col gap-px px-2 pb-2')}>
            <SettingsRow icon={<CollectionIcon />} label="Manage data sources" onClick={() => setScreen('manageSources')} />
            <SettingsRow icon={<LockIcon />} label="Lock database" value={locked ? 'On' : undefined} showChevron={false} onClick={toggleLock} />
          </div>
        </div>
      </div>
    </div>
  );
}
