import React, { useState } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useActiveViewId } from '../hooks/useDatabaseScope';
import {
  ChartIcon, EyeIcon, FilterIcon, SortIcon, ConditionalColorIcon,
  CopyLinkIcon, SourceIcon, LightningIcon, CollectionIcon, LockIcon,
} from './ui/Icons';
import {
  SettingsRow, SettingsHeader, SettingsSectionLabel,
} from './ui/MenuPrimitives';
import { ListIcon } from './ui/Icons';
import {
  FilterSettingsSubpanel, FilterPropertyPicker, getOperatorsForType,
} from './FilterComponents';

// ─── Extracted view-settings modules ─────────────────────────────────────────
import {
  VIEW_META, DEFAULT_PROPERTY_ICONS,
  SubPanelHeader, OptionList, PropertyOptionList,
  ViewIdentityRow, PropertyVisibilityRow,
  LayoutScreen,
  EditChartScreen, ChartTypeScreen, XAxisWhatScreen, XAxisSortScreen,
  YAxisWhatScreen, YAxisGroupByScreen, YAxisRangeScreen, YAxisReferenceLineScreen,
  ColorPaletteScreen, MoreStyleScreen,
} from './viewSettings';
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
// SIMPLE SUB-SCREEN CONFIGS (data-driven option lists)
// ═══════════════════════════════════════════════════════════════════════════════

interface OptionScreenCfg {
  title: string;
  back: PanelScreen;
  options: { id: string; label: string }[];
  activeKey: string;
  defaultVal: string;
  transform?: (id: string) => any;
}

const OPTION_SCREENS: Record<string, (s: Record<string, any>) => OptionScreenCfg> = {
  loadLimit: (s) => ({
    title: 'Load limit', back: 'layout',
    options: [5, 10, 25, 50, 75, 100, 150].map(n => ({ id: String(n), label: n + ' pages' })),
    activeKey: 'loadLimit', defaultVal: '50', transform: id => Number(id),
  }),
  cardPreview: (s) => ({
    title: 'Card preview', back: 'layout',
    options: [
      { id: 'none', label: 'None' }, { id: 'page_cover', label: 'Page cover' },
      { id: 'page_properties', label: 'Page properties' }, { id: 'page_content', label: 'Page content' },
    ],
    activeKey: 'cardPreview', defaultVal: 'none',
  }),
  cardSize: (s) => ({
    title: 'Card size', back: 'layout',
    options: [{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }],
    activeKey: 'cardSize', defaultVal: 'medium',
  }),
  showCalendarAs: (s) => ({
    title: 'Show calendar as', back: 'layout',
    options: [{ id: 'month', label: 'Month' }, { id: 'week', label: 'Week' }],
    activeKey: 'calendarMode', defaultVal: 'month',
  }),
  openPagesIn: (s) => ({
    title: 'Open pages in', back: 'layout',
    options: [
      { id: 'side_peek', label: 'Side peek' }, { id: 'center_peek', label: 'Center peek' },
      { id: 'full_page', label: 'Full page' },
    ],
    activeKey: 'openPagesIn', defaultVal: 'side_peek',
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function ViewSettingsPanel({ onClose }: { onClose: () => void }) {
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

  // ─── Data-driven option sub-screens ─────────────────────────────────
  const optionCfgFactory = OPTION_SCREENS[screen];
  if (optionCfgFactory) {
    const cfg = optionCfgFactory(settings);
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title={cfg.title} onBack={() => setScreen(cfg.back)} onClose={onClose} />
        <OptionList
          options={cfg.options}
          activeId={String(settings[cfg.activeKey] ?? cfg.defaultVal)}
          onSelect={id => { updateSetting(cfg.activeKey, cfg.transform ? cfg.transform(id) : id); setScreen(cfg.back); }}
        />
      </div>
    );
  }

  // ─── Property-picker sub-screens ────────────────────────────────────
  if (screen === 'showCalendarBy') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Show calendar by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList properties={dateProps} activeId={settings.showCalendarBy || ''}
          onSelect={id => { updateSetting('showCalendarBy', id); setScreen('layout'); }} noneLabel="Auto (first date)" />
      </div>
    );
  }
  if (screen === 'showTimelineBy') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Show timeline by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList properties={dateProps} activeId={settings.showTimelineBy || ''}
          onSelect={id => { updateSetting('showTimelineBy', id); setScreen('layout'); }} noneLabel="Auto" />
      </div>
    );
  }
  if (screen === 'mapBy') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Map by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList properties={placeProps} activeId={settings.mapBy || ''}
          onSelect={id => { updateSetting('mapBy', id); setScreen('layout'); }} />
      </div>
    );
  }

  // ─── Group by ───────────────────────────────────────────────────────
  if (screen === 'groupBy') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Group by" onBack={() => setScreen('layout')} onClose={onClose} />
        <div className="p-4 flex flex-col gap-1">
          <button onClick={() => { setGrouping(view.id, undefined); setScreen('layout'); }}
            className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
              !view.grouping ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
            }`}>None</button>
          {groupableProps.map(p => (
            <button key={p.id} onClick={() => { setGrouping(view.id, { propertyId: p.id }); setScreen('layout'); }}
              className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
                view.grouping?.propertyId === p.id
                  ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
              }`}>{p.name}</button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Property visibility ────────────────────────────────────────────
  if (screen === 'propertyVisibility') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Property visibility" onBack={() => setScreen('main')} onClose={onClose} />
        <div className="flex-1 overflow-auto p-2 flex flex-col gap-0.5">
          {allProps.map(prop => {
            const visible = view.visibleProperties.includes(prop.id);
            const iconName = prop.icon || DEFAULT_PROPERTY_ICONS[prop.type] || 'document';
            return (
              <PropertyVisibilityRow key={prop.id} propId={prop.id} propName={prop.name}
                iconName={iconName} visible={visible} databaseId={view.databaseId}
                onToggle={() => togglePropertyVisibility(view.id, prop.id)}
                onIconChange={name => updateProperty(view.databaseId, prop.id, { icon: name })} />
            );
          })}
        </div>
      </div>
    );
  }

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
