/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PropertyScreens.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { SubPanelHeader, OptionList, PropertyOptionList, PropertyVisibilityRow } from './SubComponents';
import { NavSettingRow } from '../ui/MenuPrimitives';
import { DEFAULT_PROPERTY_ICONS } from './constants';
import type { PanelScreen } from './constants';
import type { SchemaProperty, PropertyValue } from '../../types/database';
import { cn } from '../../utils/cn';
import { safeString } from '../../utils/safeString';

interface OptionScreenCfg {
  title: string;
  back: PanelScreen;
  options: { id: string; label: string }[];
  activeKey: string;
  defaultVal: string;
  transform?: (id: string) => PropertyValue;
}

const OPTION_SCREENS: Record<string, (_s: Record<string, PropertyValue>) => OptionScreenCfg> = {
  loadLimit: (_s) => ({
    title: 'Limit', back: 'layout',
    // Page size: fixed counts + "All" (id 0 → no windowing). Notion offers
    // 10/25/50/100; we add 75 and an explicit All.
    options: [
      ...[25, 50, 75, 100].map(n => ({ id: String(n), label: String(n) })),
      { id: '0', label: 'All' },
    ],
    activeKey: 'loadLimit', defaultVal: '50', transform: Number,
  }),
  cardPreview: (_s) => ({
    title: 'Card preview', back: 'layout',
    options: [
      { id: 'none', label: 'None' }, { id: 'page_cover', label: 'Page cover' },
      { id: 'page_properties', label: 'Page properties' }, { id: 'page_content', label: 'Page content' },
    ],
    activeKey: 'cardPreview', defaultVal: 'none',
  }),
  cardSize: (_s) => ({
    title: 'Card size', back: 'layout',
    options: [
      { id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' },
      { id: 'large', label: 'Large' }, { id: 'xl', label: 'Extra large' },
    ],
    activeKey: 'cardSize', defaultVal: 'medium',
  }),
  groupLayout: (_s) => ({
    title: 'Group layout', back: 'groupBy',
    options: [
      { id: 'stacked', label: 'Stacked (in place)' },
      { id: 'sidebar', label: 'Side panel (slice)' },
    ],
    activeKey: 'groupLayout', defaultVal: 'stacked',
  }),
  showCalendarAs: (_s) => ({
    title: 'Show calendar as', back: 'layout',
    options: [
      { id: 'month', label: 'Month' }, { id: 'week', label: 'Week' },
      { id: 'day', label: 'Day' }, { id: 'agenda', label: 'Agenda' },
    ],
    activeKey: 'calendarMode', defaultVal: 'month',
  }),
  weekStartsOn: (_s) => ({
    title: 'Start week on', back: 'layout',
    options: [{ id: '1', label: 'Monday' }, { id: '0', label: 'Sunday' }],
    activeKey: 'weekStartsOn', defaultVal: '1', transform: Number,
  }),
  openPagesIn: (_s) => ({
    title: 'Open pages in', back: 'layout',
    options: [
      { id: 'side_peek', label: 'Side peek' }, { id: 'center_peek', label: 'Center peek' },
      { id: 'full_page', label: 'Full page' },
    ],
    activeKey: 'openPagesIn', defaultVal: 'side_peek',
  }),
};

/** Context data passed to property sub-screen renderers. */
export interface PropertyScreensContext {
  settings: Record<string, PropertyValue>;
  updateSetting: (key: string, val: PropertyValue) => void;
  setScreen: (s: PanelScreen) => void;
  onClose: () => void;
  dateProps: SchemaProperty[];
  placeProps: SchemaProperty[];
  groupableProps: SchemaProperty[];
  allProps: SchemaProperty[];
  viewId: string;
  grouping?: { propertyId: string };
  setGrouping: (viewId: string, g: { propertyId: string } | undefined) => void;
  visibleProperties: string[];
  databaseId: string;
  togglePropertyVisibility: (viewId: string, propId: string) => void;
  updateProperty: (dbId: string, propId: string, updates: Partial<SchemaProperty>) => void;
  /** The view's type — gates which group extras render on the Group screen. */
  viewType?: string;
  /** Where the Group screen's Back returns (it opens from main AND Layout). */
  groupBackScreen?: PanelScreen;
}

/** Returns a React node for the given settings sub-screen, or null if unrecognized. */
export function renderPropertyScreen(screen: string, ctx: PropertyScreensContext): React.ReactNode | null {
  const { settings, updateSetting, setScreen, onClose } = ctx;

  const optionCfgFactory = OPTION_SCREENS[screen];
  if (optionCfgFactory) {
    const cfg = optionCfgFactory(settings);
    return (
      <div className={cn("flex flex-col h-full")}>
        <SubPanelHeader title={cfg.title} onBack={() => setScreen(cfg.back)} onClose={onClose} />
        <OptionList
          options={cfg.options}
          activeId={safeString(settings[cfg.activeKey] ?? cfg.defaultVal)}
          onSelect={id => { updateSetting(cfg.activeKey, cfg.transform ? cfg.transform(id) : id); setScreen(cfg.back); }}
        />
      </div>
    );
  }

  if (screen === 'showCalendarBy') {
    return (
      <div className={cn("flex flex-col h-full")}>
        <SubPanelHeader title="Show calendar by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList properties={ctx.dateProps} activeId={settings.showCalendarBy || ''}
          onSelect={id => { updateSetting('showCalendarBy', id); setScreen('layout'); }} noneLabel="Auto (first date)" />
      </div>
    );
  }
  if (screen === 'showTimelineBy') {
    return (
      <div className={cn("flex flex-col h-full")}>
        <SubPanelHeader title="Show timeline by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList properties={ctx.dateProps} activeId={settings.showTimelineBy || ''}
          onSelect={id => { updateSetting('showTimelineBy', id); setScreen('layout'); }} noneLabel="Auto" />
      </div>
    );
  }
  if (screen === 'mapBy') {
    return (
      <div className={cn("flex flex-col h-full")}>
        <SubPanelHeader title="Map by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList properties={ctx.placeProps} activeId={settings.mapBy || ''}
          onSelect={id => { updateSetting('mapBy', id); setScreen('layout'); }} />
      </div>
    );
  }
  if (screen === 'mapSizeBy') {
    return (
      <div className={cn("flex flex-col h-full")}>
        <SubPanelHeader title="Size by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList properties={ctx.allProps.filter(p => p.type === 'number')}
          activeId={settings.mapSizeBy || ''}
          onSelect={id => { updateSetting('mapSizeBy', id); setScreen('layout'); }}
          noneLabel="Count (records)" />
      </div>
    );
  }

  if (screen === 'groupBy') {
    // The Group hub: property picker + (for stackable views) the layout mode.
    // Reachable from the MAIN panel and from Layout — Back returns to origin.
    const back = ctx.groupBackScreen ?? 'layout';
    const hasGroupLayout = ['gallery', 'list', 'feed'].includes(ctx.viewType ?? '');
    return (
      <div className={cn("flex flex-col h-full")}>
        <SubPanelHeader title="Group" onBack={() => setScreen(back)} onClose={onClose} />
        <div className={cn("p-4 flex flex-col gap-1")}>
          <button onClick={() => { ctx.setGrouping(ctx.viewId, undefined); setScreen(back); }}
            className={cn(`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
              ctx.grouping ? 'text-ink-body hover:bg-hover-surface' : 'bg-accent-soft text-accent-text font-medium'
            }`)}>None</button>
          {ctx.groupableProps.map(p => (
            <button key={p.id} onClick={() => { ctx.setGrouping(ctx.viewId, { propertyId: p.id }); }}
              className={cn(`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
                ctx.grouping?.propertyId === p.id
                  ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
              }`)}>{p.name}</button>
          ))}
        </div>
        {ctx.grouping && hasGroupLayout && (
          <div className={cn("px-3 pb-3 border-t border-line-light pt-2")}>
            <NavSettingRow label="Group layout"
              value={settings.groupLayout === 'sidebar' ? 'Side panel' : 'Stacked'}
              onClick={() => setScreen('groupLayout')} />
          </div>
        )}
      </div>
    );
  }

  if (screen === 'propertyVisibility') {
    return (
      <div className={cn("flex flex-col h-full")}>
        <SubPanelHeader title="Property visibility" onBack={() => setScreen('main')} onClose={onClose} />
        <div className={cn("flex-1 overflow-auto p-2 flex flex-col gap-0.5")}>
          {ctx.allProps.map(prop => {
            const visible = ctx.visibleProperties.includes(prop.id);
            const iconName = prop.icon || DEFAULT_PROPERTY_ICONS[prop.type] || 'document';
            return (
              <PropertyVisibilityRow key={prop.id} propId={prop.id} propName={prop.name}
                iconName={iconName} visible={visible} databaseId={ctx.databaseId}
                onToggle={() => ctx.togglePropertyVisibility(ctx.viewId, prop.id)}
                onIconChange={name => ctx.updateProperty(ctx.databaseId, prop.id, { icon: name })} />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
