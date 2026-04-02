/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ViewSettingsPanel.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 15:07:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import {
  EyeIcon, FilterIcon, SortIcon, ConditionalColorIcon,
  CopyLinkIcon, SourceIcon, LightningIcon, CollectionIcon, LockIcon,
} from './ui/Icons';
import {
  SettingsRow, SettingsHeader, SettingsSectionLabel,
} from './ui/MenuPrimitives';
import { ListIcon } from './ui/Icons';
import {
  FilterSettingsSubpanel, FilterPropertyPicker, getOperatorsForType,
} from './FilterComponents';
import {
  VIEW_META, ViewIdentityRow, LayoutScreen,
  EditChartScreen, ChartTypeScreen, XAxisWhatScreen, XAxisSortScreen,
  YAxisWhatScreen, YAxisGroupByScreen, YAxisRangeScreen, YAxisReferenceLineScreen,
  ColorPaletteScreen, MoreStyleScreen,
} from './viewSettings';
import { renderPropertyScreen } from './viewSettings/PropertyScreens';
import type { PanelScreen, ChartScreensProps } from './viewSettings';

// ═══════════════════════════════════════════════════════════════════════════════
// CHART SCREEN DISPATCH MAP
// ═══════════════════════════════════════════════════════════════════════════════

const CHART_SCREEN_MAP: Record<string, React.ComponentType<ChartScreensProps>> = {
  editChart:          EditChartScreen,
  chartType:          ChartTypeScreen,
  xAxisWhat:          XAxisWhatScreen,
  xAxisSort:          XAxisSortScreen,
  yAxisWhat:          YAxisWhatScreen,
  yAxisGroupBy:       YAxisGroupByScreen,
  yAxisRange:         YAxisRangeScreen,
  yAxisReferenceLine: YAxisReferenceLineScreen,
  colorPalette:       ColorPaletteScreen,
  moreStyle:          MoreStyleScreen,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function ViewSettingsPanel({ onClose }: Readonly<{ onClose: () => void }>) {
  const activeViewId = useActiveViewId();
  const {
    views, databases, updateViewSettings, updateView,
    togglePropertyVisibility, setGrouping, updateProperty,
  } = useDatabaseStore();

  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const [screen, setScreen] = useState<PanelScreen>(view?.type === 'chart' ? 'editChart' : 'main');
  const [viewIcon, setViewIcon] = useState(view?.settings?.viewIcon || '');

  if (!view || !database) return null;

  const settings = view.settings || {};
  const allProps = Object.values(database.properties);
  const dateProps = allProps.filter(p => p.type === 'date');
  const groupableProps = allProps.filter(p =>
    ['select', 'multi_select', 'status', 'checkbox', 'user', 'person', 'assigned_to', 'due_date'].includes(p.type));
  const placeProps = allProps.filter(p => p.type === 'place' || p.type === 'text');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSetting = (key: string, val: any) => updateViewSettings(view.id, { [key]: val });
  const goHome = () => setScreen(view.type === 'chart' ? 'editChart' : 'main');

  const identityProps = {
    viewIcon, setViewIcon,
    viewName: view.name,
    onNameChange: (v: string) => updateView(view.id, { name: v }),
    onIconChange: (v: string) => updateSetting('viewIcon', v),
    viewType: view.type,
  };

  // ─── Chart screens ──────────────────────────────────────────────────
  const ChartComponent = CHART_SCREEN_MAP[screen];
  if (ChartComponent) {
    const chartProps: ChartScreensProps = {
      screen, setScreen, settings, updateSetting, allProps, groupableProps,
      databaseName: database.name, onClose, identityProps,
    };
    return <ChartComponent {...chartProps} />;
  }

  // ─── Filter screen ──────────────────────────────────────────────────
  if (screen === 'filter') {
    return (
      <div className="flex flex-col h-full" style={{ minWidth: 290, maxWidth: 290 }}>
        <FilterSettingsSubpanel
          viewId={view.id} properties={database.properties}
          filters={view.filters || []} conjunction={view.filterConjunction || 'and'}
          onBack={() => setScreen('main')} onClose={onClose}
        />
      </div>
    );
  }

  // ─── Add filter screen ──────────────────────────────────────────────
  if (screen === 'addFilter') {
    const props = Object.values(database.properties) as import('../types/database').SchemaProperty[];
    return (
      <div className="flex flex-col h-full" style={{ minWidth: 290, maxWidth: 290 }}>
        <FilterPropertyPicker
          properties={props}
          onSelect={propId => {
            const prop = database.properties[propId];
            const ops = getOperatorsForType(prop?.type || 'text');
            useDatabaseStore.getState().addFilter(view.id, { propertyId: propId, operator: ops[0].value, value: '' });
            setScreen('filter');
          }}
          onClose={() => setScreen('filter')} title="Add filter"
          onAdvancedFilter={() => setScreen('filter')}
        />
      </div>
    );
  }

  // ─── Layout screen ─────────────────────────────────────────────────
  if (screen === 'layout') {
    return (
      <LayoutScreen
        viewId={view.id} viewType={view.type} settings={settings}
        allProps={allProps} grouping={view.grouping} setScreen={setScreen}
        goHome={goHome} onClose={onClose} updateView={updateView}
        updateSetting={updateSetting}
      />
    );
  }

  // ─── Property / option / group-by / visibility sub-screens ──────────
  const propertyNode = renderPropertyScreen(screen, {
    settings, updateSetting, setScreen, onClose,
    dateProps, placeProps, groupableProps, allProps,
    viewId: view.id, grouping: view.grouping, setGrouping,
    visibleProperties: view.visibleProperties, databaseId: view.databaseId,
    togglePropertyVisibility, updateProperty,
  });
  if (propertyNode) return <>{propertyNode}</>;

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN SCREEN
  // ═══════════════════════════════════════════════════════════════════════
  const currentViewMeta = VIEW_META[view.type];
  const visibleCount = view.visibleProperties.length;

  return (
    <div className="flex flex-col h-full" style={{ minWidth: 290, maxWidth: 290 }}>
      <SettingsHeader title="View settings" onClose={onClose} />
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        <div className="flex flex-col gap-px">
          <ViewIdentityRow {...identityProps} fallbackIcon={currentViewMeta.svgIcon} />
          <div className="flex flex-col gap-px px-2 py-1">
            <SettingsRow icon={currentViewMeta.svgIcon} label="Layout" value={currentViewMeta.label} onClick={() => setScreen('layout')} />
            <SettingsRow icon={<EyeIcon />} label="Property visibility" value={String(visibleCount)} onClick={() => setScreen('propertyVisibility')} />
            <SettingsRow icon={<FilterIcon />} label="Filter" onClick={() => setScreen('filter')} />
            <SettingsRow icon={<SortIcon />} label="Sort" onClick={() => {}} />
            <SettingsRow icon={<ConditionalColorIcon />} label="Conditional color" onClick={() => {}} />
            <SettingsRow icon={<CopyLinkIcon className="w-5 h-5" />} label="Copy link to view" showChevron={false} onClick={() => {}} />
          </div>
          <SettingsSectionLabel>Data source settings</SettingsSectionLabel>
          <div className="flex flex-col gap-px px-2 pb-2">
            <SettingsRow icon={<SourceIcon />} label="Source" value={database.name} onClick={() => {}} />
            <SettingsRow icon={<ListIcon className="w-5 h-5" />} label="Edit properties" onClick={() => {}} />
            <SettingsRow icon={<LightningIcon />} label="Automations" onClick={() => {}} />
          </div>
          <SettingsSectionLabel>&nbsp;</SettingsSectionLabel>
          <div className="flex flex-col gap-px px-2 pb-2">
            <SettingsRow icon={<CollectionIcon />} label="Manage data sources" onClick={() => {}} />
            <SettingsRow icon={<LockIcon />} label="Lock database" showChevron={false} onClick={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}
