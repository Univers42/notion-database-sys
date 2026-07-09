/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   LayoutScreen.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:05 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import {
  ViewTypeCard, ToggleSettingRow, NavSettingRow, MenuDivider,
} from '../ui/MenuPrimitives';
import { VIEW_META, LAYOUT_ORDER } from './constants';
import { SubPanelHeader, CardLayoutPicker } from './SubComponents';
import type { PanelScreen } from './constants';
import { MAP_MODE_LABEL, type MapDisplayMode } from '../views/map/mapModes';
import type { ViewType, SchemaProperty, ViewSettings } from '../../types/database';
import { cn } from '../../utils/cn';

/** Props for {@link LayoutScreen}. */
export interface LayoutScreenProps {
  viewId: string;
  viewType: ViewType;
  settings: ViewSettings;
  allProps: SchemaProperty[];
  grouping?: { propertyId: string };
  setScreen: (s: PanelScreen) => void;
  goHome: () => void;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateView: (id: string, updates: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSetting: (key: string, val: any) => void;
}

// Record-list views where a page-size "Limit" is meaningful (spatial views —
// calendar/map — and charts show by time/geometry, not by row count).
const LIMIT_VIEW_TYPES: ReadonlySet<string> = new Set(['table', 'board', 'gallery', 'list', 'feed', 'timeline']);

function PerViewSettings({ viewType, settings, allProps, grouping, setScreen, updateSetting }: Readonly<LayoutScreenProps>) {
  const groupName = grouping ? allProps.find(p => p.id === grouping.propertyId)?.name : 'None';

  switch (viewType) {
    case 'table':
      return (
        <>
          <ToggleSettingRow label="Show vertical lines" checked={!!settings.showVerticalLines} onChange={v => updateSetting('showVerticalLines', v)} />
          <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
          <ToggleSettingRow label="Wrap all content" checked={!!settings.wrapContent} onChange={v => updateSetting('wrapContent', v)} />
          <NavSettingRow label="Group by" value={groupName} onClick={() => setScreen('groupBy')} />
          <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
        </>
      );
    case 'board':
      return (
        <>
          <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
          <ToggleSettingRow label="Wrap all content" checked={!!settings.wrapContent} onChange={v => updateSetting('wrapContent', v)} />
          <NavSettingRow label="Group by" value={groupName} onClick={() => setScreen('groupBy')} />
          <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
          <MenuDivider />
          <NavSettingRow label="Card preview" value={settings.cardPreview || 'None'} onClick={() => setScreen('cardPreview')} />
          <NavSettingRow label="Card size" value={settings.cardSize || 'Medium'} onClick={() => setScreen('cardSize')} />
        </>
      );
    case 'timeline':
      return (
        <>
          <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
          <NavSettingRow label="Show timeline by"
            value={settings.showTimelineBy ? allProps.find(p => p.id === settings.showTimelineBy)?.name : 'Date'}
            onClick={() => setScreen('showTimelineBy')} />
          <ToggleSettingRow label="Separate start and end dates" checked={!!settings.separateStartEndDates} onChange={v => updateSetting('separateStartEndDates', v)} />
          <ToggleSettingRow label="Show table" checked={settings.showTable !== false} onChange={v => updateSetting('showTable', v)} />
          <NavSettingRow label="Group by" value={groupName} onClick={() => setScreen('groupBy')} />
          <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
        </>
      );
    case 'calendar':
      return (
        <>
          <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
          <ToggleSettingRow label="Wrap page titles" checked={!!settings.wrapPageTitles} onChange={v => updateSetting('wrapPageTitles', v)} />
          <NavSettingRow label="Show calendar by"
            value={settings.showCalendarBy ? allProps.find(p => p.id === settings.showCalendarBy)?.name : 'Date'}
            onClick={() => setScreen('showCalendarBy')} />
          <NavSettingRow label="Show calendar as" value={settings.calendarMode || 'Month'} onClick={() => setScreen('showCalendarAs')} />
          <ToggleSettingRow label="Show weekends" checked={settings.showWeekends !== false} onChange={v => updateSetting('showWeekends', v)} />
          <NavSettingRow label="Start week on" value={settings.weekStartsOn === 0 ? 'Sunday' : 'Monday'} onClick={() => setScreen('weekStartsOn')} />
          <ToggleSettingRow label="Show week numbers" checked={!!settings.showWeekNumbers} onChange={v => updateSetting('showWeekNumbers', v)} />
          <NavSettingRow label="Group by" value={groupName} onClick={() => setScreen('groupBy')} />
          <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
        </>
      );
    case 'list':
      return (
        <>
          <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
          <NavSettingRow label="Group by" value={groupName} onClick={() => setScreen('groupBy')} />
          {grouping && (
            <NavSettingRow label="Group layout"
              value={settings.groupLayout === 'sidebar' ? 'Side panel' : 'Stacked'}
              onClick={() => setScreen('groupLayout')} />
          )}
          <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
        </>
      );
    case 'dashboard':
      return (
        <>
          {/* Stacks widget rows earlier (count-aware) when the container is
              too narrow for them to read — inline embeds, slim panes. */}
          <ToggleSettingRow label="Responsive layout" checked={!!settings.responsiveLayout} onChange={v => updateSetting('responsiveLayout', v)} />
          <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
          <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
        </>
      );
    case 'gallery':
      return (
        <>
          <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
          <ToggleSettingRow label="Wrap all content" checked={!!settings.wrapContent} onChange={v => updateSetting('wrapContent', v)} />
          <NavSettingRow label="Group by" value={groupName} onClick={() => setScreen('groupBy')} />
          {grouping && (
            <NavSettingRow label="Group layout"
              value={settings.groupLayout === 'sidebar' ? 'Side panel' : 'Stacked'}
              onClick={() => setScreen('groupLayout')} />
          )}
          <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
          <MenuDivider />
          <NavSettingRow label="Card preview" value={settings.cardPreview || 'None'} onClick={() => setScreen('cardPreview')} />
          <NavSettingRow label="Card size" value={settings.cardSize || 'Medium'} onClick={() => setScreen('cardSize')} />
          <ToggleSettingRow label="Fit media" checked={settings.fitMedia !== false} onChange={v => updateSetting('fitMedia', v)} />
        </>
      );
    case 'chart':
      return <NavSettingRow label="Edit chart" onClick={() => setScreen('editChart')} />;
    case 'feed':
      return (
        <>
          <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
          <ToggleSettingRow label="Wrap properties" checked={!!settings.wrapProperties} onChange={v => updateSetting('wrapProperties', v)} />
          <ToggleSettingRow label="Show author byline" checked={settings.showAuthorByline !== false} onChange={v => updateSetting('showAuthorByline', v)} />
          <NavSettingRow label="Group by" value={groupName} onClick={() => setScreen('groupBy')} />
          {grouping && (
            <NavSettingRow label="Group layout"
              value={settings.groupLayout === 'sidebar' ? 'Side panel' : 'Stacked'}
              onClick={() => setScreen('groupLayout')} />
          )}
          <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
        </>
      );
    case 'map': {
      const mode = settings.mapDisplayMode ?? 'pins';
      return (
        <>
          <div className={cn("px-2 py-1.5")}>
            <div className={cn("text-xs text-ink-muted mb-1.5")}>Display as</div>
            <div className={cn("grid grid-cols-4 gap-1")} role="radiogroup" aria-label="Map display mode">
              {(Object.entries(MAP_MODE_LABEL) as [MapDisplayMode, string][]).map(([value, label]) => (
                <button key={value} type="button" role="radio" aria-checked={mode === value}
                  onClick={() => updateSetting('mapDisplayMode', value)}
                  className={cn(`px-1 py-1.5 text-[11px] rounded-md border transition-colors ${
                    mode === value
                      ? 'border-accent-border bg-accent-soft text-accent-text font-medium'
                      : 'border-line text-ink-secondary hover:bg-hover-surface'
                  }`)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {(mode === 'heat' || mode === 'bubbles') && (
            <NavSettingRow label="Size by"
              value={settings.mapSizeBy ? allProps.find(p => p.id === settings.mapSizeBy)?.name || 'Count' : 'Count'}
              onClick={() => setScreen('mapSizeBy')} />
          )}
          <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
          <NavSettingRow label="Map by"
            value={settings.mapBy ? allProps.find(p => p.id === settings.mapBy)?.name : 'Place'}
            onClick={() => setScreen('mapBy')} />
          <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
        </>
      );
    }
    default:
      return null;
  }
}

/** Renders the view layout picker with per-view-type settings (grouping, card preview, etc.). */
export function LayoutScreen(props: Readonly<LayoutScreenProps>) {
  const { viewId, viewType, settings, setScreen, goHome, onClose, updateView, updateSetting } = props;
  return (
    <div className={cn("flex flex-col h-full")} style={{ minWidth: 290, maxWidth: 290 }}>
      <SubPanelHeader title="Layout" onBack={goHome} onClose={onClose} />
      <div className={cn("flex-1 overflow-auto")} style={{ minHeight: 0 }}>
        <div className={cn("px-3 pt-2")}>
          <div className={cn("grid grid-cols-3 gap-2")}>
            {LAYOUT_ORDER.map(type => (
              <ViewTypeCard
                key={type}
                icon={VIEW_META[type].svgIcon}
                label={VIEW_META[type].label}
                active={viewType === type}
                onClick={() => {
                  updateView(viewId, { type });
                  if (type === 'chart') setScreen('editChart');
                }}
              />
            ))}
          </div>
        </div>
        <div className={cn("flex flex-col gap-px px-2 py-2")}>
          <PerViewSettings {...props} />
          {LIMIT_VIEW_TYPES.has(viewType) && (
            <NavSettingRow label="Limit"
              value={settings.loadLimit === 0 ? 'All' : String(settings.loadLimit || 50)}
              onClick={() => setScreen('loadLimit')} />
          )}
        </div>
        {(viewType === 'board' || viewType === 'gallery') && (
          <CardLayoutPicker
            value={settings.cardLayout || 'compact'}
            onChange={v => updateSetting('cardLayout', v)}
          />
        )}
      </div>
    </div>
  );
}
