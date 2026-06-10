/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ViewSettingsPanel.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 20:16:42 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { useDatabaseStore, useStoreApi } from '../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import {
  FilterSettingsSubpanel, FilterPropertyPicker, getOperatorsForType,
  SortSettingsSubpanel,
} from './FilterComponents';
import {
  VIEW_META, LayoutScreen,
  EditChartScreen, ChartTypeScreen, XAxisWhatScreen, XAxisSortScreen,
  XAxisBucketScreen, XAxisGroupsScreen,
  YAxisWhatScreen, YAxisGroupByScreen, YAxisRangeScreen, YAxisReferenceLineScreen,
  ColorPaletteScreen, MoreStyleScreen,
} from './viewSettings/index';
import { MainSettingsScreen } from './viewSettings/MainSettingsScreen';
import { SourcePickerScreen } from './viewSettings/SourcePickerScreen';
import { renderPropertyScreen } from './viewSettings/PropertyScreens';
import type { PanelScreen, ChartScreensProps } from './viewSettings/index';
import { cn } from '../utils/cn';

const CHART_SCREEN_MAP: Record<string, React.ComponentType<ChartScreensProps>> = {
  editChart:          EditChartScreen,
  chartType:          ChartTypeScreen,
  xAxisWhat:          XAxisWhatScreen,
  xAxisSort:          XAxisSortScreen,
  xAxisBucket:        XAxisBucketScreen,
  xAxisGroups:        XAxisGroupsScreen,
  yAxisWhat:          YAxisWhatScreen,
  yAxisGroupBy:       YAxisGroupByScreen,
  yAxisRange:         YAxisRangeScreen,
  yAxisReferenceLine: YAxisReferenceLineScreen,
  colorPalette:       ColorPaletteScreen,
  moreStyle:          MoreStyleScreen,
};

/** Multi-screen settings panel for configuring view layout, filters, sorts, properties, and charts. */
export function ViewSettingsPanel({ onClose }: Readonly<{ onClose: () => void }>) {
  const activeViewId = useActiveViewId();
  const {
    views, databases, updateViewSettings, updateView,
    togglePropertyVisibility, setGrouping, updateProperty,
  } = useDatabaseStore();
  const storeApi = useStoreApi();

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

  const ChartComponent = CHART_SCREEN_MAP[screen];
  if (ChartComponent) {
    const chartProps: ChartScreensProps = {
      screen, setScreen, settings, updateSetting, allProps, groupableProps,
      databaseName: database.name, onClose, identityProps,
    };
    return <ChartComponent {...chartProps} />;
  }

  if (screen === 'source') {
    return (
      <SourcePickerScreen
        viewId={view.id} currentDatabaseId={view.databaseId}
        onBack={goHome} onClose={onClose}
      />
    );
  }

  if (screen === 'filter') {
    return (
      <div className={cn("flex flex-col h-full")} style={{ minWidth: 290, maxWidth: 290 }}>
        <FilterSettingsSubpanel
          viewId={view.id} properties={database.properties}
          filters={view.filters || []} conjunction={view.filterConjunction || 'and'}
          onBack={() => setScreen('main')} onClose={onClose}
        />
      </div>
    );
  }

  if (screen === 'sort') {
    return (
      <div className={cn("flex flex-col h-full")} style={{ minWidth: 290, maxWidth: 290 }}>
        <SortSettingsSubpanel
          viewId={view.id} properties={database.properties}
          sorts={view.sorts || []} onBack={() => setScreen('main')} onClose={onClose}
        />
      </div>
    );
  }

  if (screen === 'addFilter') {
    const props = Object.values(database.properties) as import('../types/database').SchemaProperty[];
    return (
      <div className={cn("flex flex-col h-full")} style={{ minWidth: 290, maxWidth: 290 }}>
        <FilterPropertyPicker
          properties={props}
          onSelect={propId => {
            const prop = database.properties[propId];
            const ops = getOperatorsForType(prop?.type || 'text');
            storeApi.getState().addFilter(view.id, { propertyId: propId, operator: ops[0].value, value: '' });
            setScreen('filter');
          }}
          onClose={() => setScreen('filter')} title="Add filter"
          onAdvancedFilter={() => setScreen('filter')}
        />
      </div>
    );
  }

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

  const propertyNode = renderPropertyScreen(screen, {
    settings, updateSetting, setScreen, onClose,
    dateProps, placeProps, groupableProps, allProps,
    viewId: view.id, grouping: view.grouping, setGrouping,
    visibleProperties: view.visibleProperties, databaseId: view.databaseId,
    togglePropertyVisibility, updateProperty,
  });
  if (propertyNode) return <>{propertyNode}</>;

  // MAIN SCREEN
  const currentViewMeta = VIEW_META[view.type];

  return (
    <MainSettingsScreen
      identityProps={{ ...identityProps, fallbackIcon: currentViewMeta.svgIcon }}
      layoutLabel={currentViewMeta.label}
      layoutIcon={currentViewMeta.svgIcon}
      visibleCount={view.visibleProperties.length}
      sortCount={view.sorts.length}
      databaseName={database.name}
      setScreen={setScreen}
      onClose={onClose}
    />
  );
}
