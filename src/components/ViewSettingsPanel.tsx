import React, { useState, useRef } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { Eye, EyeOff } from 'lucide-react';
import {
  TableIcon, BoardIcon, GalleryIcon, ListIcon, ChartIcon,
  DashboardIcon, TimelineIcon, FeedIcon, MapViewIcon, CalendarIcon,
  EyeIcon, FilterIcon, SortIcon, ConditionalColorIcon,
  CopyLinkIcon, SourceIcon, LightningIcon,
  CollectionIcon, LockIcon, InfoCircleIcon, EyeSlashIcon,
  // Chart-specific icons
  VerticalBarChartIcon, HorizontalBarChartIcon, LineChartIcon,
  DonutChartIcon, NumberIcon, ArrowTurnDownRightIcon,
  ArrowUpDownRotatedIcon, ArrowTurnLeftUpIcon, RectangleSplitIcon,
  ArrowUpDownStackedIcon, DottedLineIcon, PaintPaletteIcon,
  PaintBrushIcon, ArrowLineDownIcon, LinkIcon, PathRoundEndsIcon,
  QuestionMarkCircleIcon,
} from './ui/Icons';
import { Icon } from './ui/Icon';
import { IconPickerPopover } from './ui/IconPicker';
import {
  ViewTypeCard, SettingsRow, SettingsHeader, SettingsSectionLabel,
  MenuDivider, ToggleSwitch, ToggleSettingRow, NavSettingRow,
} from './ui/MenuPrimitives';
import type { ViewType, PropertyType } from '../types/database';
import { FilterSettingsSubpanel, FilterPropertyPicker, getOperatorsForType } from './FilterComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW SETTINGS PANEL — Full Notion-like configuration
// ═══════════════════════════════════════════════════════════════════════════════

type PanelScreen =
  | 'main'
  | 'layout'
  | 'propertyVisibility'
  | 'filter'
  | 'addFilter'
  | 'loadLimit'
  | 'cardPreview'
  | 'cardSize'
  | 'showCalendarBy'
  | 'showCalendarAs'
  | 'showTimelineBy'
  | 'openPagesIn'
  | 'groupBy'
  | 'mapBy'
  | 'editChart'
  | 'chartType'
  | 'xAxisWhat'
  | 'xAxisSort'
  | 'yAxisWhat'
  | 'yAxisGroupBy'
  | 'yAxisRange'
  | 'yAxisReferenceLine'
  | 'colorPalette'
  | 'moreStyle';

const VIEW_META: Record<ViewType, { svgIcon: React.ReactNode; label: string }> = {
  table:     { svgIcon: <TableIcon />,     label: 'Table' },
  board:     { svgIcon: <BoardIcon />,     label: 'Board' },
  timeline:  { svgIcon: <TimelineIcon />,  label: 'Timeline' },
  calendar:  { svgIcon: <CalendarIcon />,  label: 'Calendar' },
  list:      { svgIcon: <ListIcon />,      label: 'List' },
  gallery:   { svgIcon: <GalleryIcon />,   label: 'Gallery' },
  chart:     { svgIcon: <ChartIcon />,     label: 'Chart' },
  feed:      { svgIcon: <FeedIcon />,      label: 'Feed' },
  map:       { svgIcon: <MapViewIcon />,   label: 'Map' },
  dashboard: { svgIcon: <DashboardIcon />, label: 'Dashboard' },
};

const CHART_TYPE_META: { type: string; icon: React.ReactNode; label: string }[] = [
  { type: 'vertical_bar',   icon: <VerticalBarChartIcon className="w-5 h-5" />,   label: 'Vertical bar' },
  { type: 'horizontal_bar', icon: <HorizontalBarChartIcon className="w-5 h-5" />, label: 'Horizontal bar' },
  { type: 'line',           icon: <LineChartIcon className="w-5 h-5" />,           label: 'Line' },
  { type: 'donut',          icon: <DonutChartIcon className="w-5 h-5" />,          label: 'Donut' },
  { type: 'number',         icon: <NumberIcon className="w-5 h-5" />,              label: 'Number' },
];

const LAYOUT_ORDER: ViewType[] = [
  'table', 'board', 'timeline', 'calendar', 'list',
  'gallery', 'chart', 'feed', 'map', 'dashboard',
];

// ─── DEFAULT ICONS PER VIEW TYPE (picker registry keys) ─────────────────────

const DEFAULT_VIEW_ICONS: Record<ViewType, string> = {
  table:     'ui/table',
  board:     'ui/board',
  timeline:  'ui/timeline',
  calendar:  'ui/calendar',
  list:      'ui/list',
  gallery:   'ui/gallery',
  chart:     'ui/chart',
  feed:      'ui/feed',
  map:       'ui/map-view',
  dashboard: 'ui/dashboard',
};

// ─── DEFAULT ICONS PER PROPERTY TYPE (picker registry keys) ─────────────────

const DEFAULT_PROPERTY_ICONS: Record<PropertyType, string> = {
  title:            'document',
  text:             'pencil-square-outline',
  number:           '123',
  select:           'check',
  multi_select:     'checkmark-list',
  status:           'activity-rectangle',
  date:             'calendar',
  checkbox:         'checkmark-square',
  person:           'vitruvian-man-circle',
  user:             'vitruvian-man-circle',
  url:              'arrow-northeast',
  email:            'exclamation-speech-bubble',
  phone:            'bell',
  files_media:      'paperclip',
  relation:         'arrows-swap-horizontal',
  formula:          'angle-brackets-solidus',
  rollup:           'chart-pie',
  button:           'cursor-click',
  place:            'compass',
  id:               'identification-badge',
  created_time:     'clock',
  last_edited_time: 'clock-outline',
  created_by:       'user-speech-bubble',
  last_edited_by:   'user-speech-bubble',
  assigned_to:      'vitruvian-man-circle',
  due_date:         'calendar',
  custom:           'identification-badge',
};

// ─── REUSABLE SUB-COMPONENTS ─────────────────────────────────────────────────

function SubPanelHeader({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose?: () => void }) {
  return <SettingsHeader title={title} onBack={onBack} onClose={onClose} />;
}

/** Reusable option list used by many sub-screens */
function OptionList({ options, activeId, onSelect }: {
  options: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="p-4 flex flex-col gap-1">
      {options.map(o => (
        <button key={o.id} onClick={() => onSelect(o.id)}
          className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
            activeId === o.id
              ? 'bg-accent-soft text-accent-text font-medium'
              : 'text-ink-body hover:bg-hover-surface'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Property option list for sub-screens that pick a property */
function PropertyOptionList({ properties, activeId, onSelect, noneLabel }: {
  properties: { id: string; name: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  noneLabel?: string;
}) {
  return (
    <div className="p-4 flex flex-col gap-1">
      {noneLabel && (
        <button onClick={() => onSelect('')}
          className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
            !activeId ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
          }`}>
          {noneLabel}
        </button>
      )}
      {properties.map(p => (
        <button key={p.id} onClick={() => onSelect(p.id)}
          className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
            activeId === p.id
              ? 'bg-accent-soft text-accent-text font-medium'
              : 'text-ink-body hover:bg-hover-surface'
          }`}>
          {p.name}
        </button>
      ))}
    </div>
  );
}

/** Toggle used in chart sub-screens (larger style) */
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className="flex items-center justify-between text-sm text-ink-body py-1 px-1 rounded-lg hover:bg-hover-surface transition-colors">
      <span>{label}</span>
      <div className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-strong'}`}>
        <div className={`absolute w-4 h-4 bg-surface-primary rounded-full shadow-sm top-0.5 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

// ─── CARD LAYOUT PICKER (visual radio for Compact / List) ───────────────────

function CardLayoutPicker({ value, onChange }: { value: 'compact' | 'list'; onChange: (v: 'compact' | 'list') => void }) {
  return (
    <div className="mx-2 mb-2 rounded-[10px] p-3 bg-surface-tertiary-soft4 flex flex-col items-center overflow-hidden">
      <div className="text-xs font-medium text-ink-secondary mb-3 select-none">Card layout</div>
      <div className="flex justify-center w-full px-1.5 gap-3">
        {(['compact', 'list'] as const).map(layout => {
          const isActive = value === layout;
          const accent = isActive ? 'bg-accent-muted2' : 'bg-surface-tertiary';
          const elAccent = isActive ? 'bg-accent-subtle2' : 'bg-surface-muted-soft';
          return (
            <div key={layout} className="flex flex-col items-center flex-1 max-w-[150px] gap-1.5">
              <button
                type="button" role="radio" aria-checked={isActive}
                onClick={() => onChange(layout)}
                className="relative w-full bg-surface-primary border-none rounded-[10px]"
                style={{
                  padding: 10,
                  aspectRatio: '4 / 3',
                  outline: isActive ? '2px solid var(--color-outline-active)' : '1px solid var(--color-outline-inactive)',
                  outlineOffset: isActive ? -2 : -1,
                }}
              >
                <div className={`absolute inset-x-0 top-0 h-[32%] ${accent} rounded-t-[10px]`} />
                <div className={`absolute left-[10%] top-[23%] h-[18%] aspect-square rounded-full ${elAccent}`} />
                {layout === 'compact' ? (
                  <>
                    <div className="absolute left-[10%] top-[50%] w-[75%] h-[7%] flex gap-[5px]">
                      <div className={`rounded-full h-full ${elAccent} flex-1`} />
                      <div className={`rounded-full h-full ${elAccent} flex-1`} />
                      <div className={`rounded-full h-full ${elAccent} flex-1`} />
                    </div>
                    <div className="absolute left-[10%] top-[66%] w-[60%] h-[7%] flex gap-[5px]">
                      <div className={`rounded-full h-full ${elAccent} flex-1`} />
                      <div className={`rounded-full h-full ${elAccent} flex-1`} />
                    </div>
                  </>
                ) : (
                  <div className="absolute left-[10%] top-[50%] flex flex-col gap-[20%] h-[36%] w-full">
                    <div className={`rounded-full h-full w-[55%] ${elAccent}`} />
                    <div className={`rounded-full h-full w-[25%] ${elAccent}`} />
                    <div className={`rounded-full h-full w-[40%] ${elAccent}`} />
                  </div>
                )}
              </button>
              <span className={`text-sm ${isActive ? 'text-ink' : 'text-ink-secondary'}`}>
                {layout === 'compact' ? 'Compact' : 'List'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VIEW IDENTITY BLOCK (icon + name input) ────────────────────────────────

function ViewIdentityRow({ viewIcon, setViewIcon, viewName, onNameChange, onIconChange, fallbackIcon, viewType }: {
  viewIcon: string;
  setViewIcon: (v: string) => void;
  viewName: string;
  onNameChange: (v: string) => void;
  onIconChange: (v: string) => void;
  fallbackIcon: React.ReactNode;
  viewType: ViewType;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const currentIcon = viewIcon || DEFAULT_VIEW_ICONS[viewType];

  return (
    <div className="px-4 pt-1 pb-1.5">
      <div className="flex items-center gap-2">
        <button
          ref={btnRef}
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-line hover:border-hover-border text-ink-secondary bg-surface-primary transition-colors shrink-0"
          title="Change icon"
        >
          <Icon name={currentIcon} className="w-[18px] h-[18px]" />
        </button>
        {showPicker && (
          <IconPickerPopover
            anchorRef={btnRef}
            value={viewIcon || null}
            onSelect={(name) => {
              setViewIcon(name);
              onIconChange(name);
              setShowPicker(false);
            }}
            onRemove={() => {
              setViewIcon('');
              onIconChange('');
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center h-7 rounded-md border border-line bg-surface-secondary-soft px-1.5">
            <input
              placeholder="View name" type="text"
              value={viewName}
              onChange={e => onNameChange(e.target.value)}
              className="flex-1 text-sm text-ink outline-none bg-transparent min-w-0"
            />
            <div className="relative group/info ml-1">
              <InfoCircleIcon className="w-[14px] h-[14px] text-ink-muted cursor-help" />
              <div className="absolute right-0 bottom-full mb-1 w-48 p-2 bg-surface-inverse text-ink-inverse text-[10px] rounded-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50">
                Configure how this view displays your data. Changes only affect this view.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROPERTY ROW with clickable icon ────────────────────────────────────────

function PropertyRow({ propId, propName, iconName, visible, databaseId, onToggle, onIconChange }: {
  propId: string;
  propName: string;
  iconName: string;
  visible: boolean;
  databaseId: string;
  onToggle: () => void;
  onIconChange: (name: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-hover-surface transition-colors text-sm group">
      {/* Clickable icon */}
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
        className="flex items-center justify-center w-5 h-5 rounded hover:bg-hover-surface3 transition-colors shrink-0"
        title="Change property icon"
      >
        <Icon name={iconName} className="w-4 h-4 text-ink-muted" />
      </button>
      {showPicker && (
        <IconPickerPopover
          anchorRef={btnRef}
          value={iconName}
          onSelect={(name) => {
            onIconChange(name);
            setShowPicker(false);
          }}
          onRemove={() => {
            onIconChange('');
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Name — clicking toggles visibility */}
      <button
        onClick={onToggle}
        className="flex-1 text-left min-w-0 truncate"
      >
        <span className={visible ? 'text-ink' : 'text-ink-muted'}>{propName}</span>
      </button>

      {/* Eye toggle */}
      <button onClick={onToggle} className="shrink-0">
        {visible
          ? <Eye className="w-3.5 h-3.5 text-accent-text-soft opacity-60 group-hover:opacity-100" />
          : <EyeOff className="w-3.5 h-3.5 text-ink-disabled group-hover:text-ink-muted" />}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function ViewSettingsPanel({ onClose }: { onClose: () => void }) {
  const {
    activeViewId, views, databases, updateViewSettings, updateView,
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
  const groupableProps = allProps.filter(p => ['select', 'multi_select', 'status', 'checkbox', 'user', 'person', 'assigned_to', 'due_date'].includes(p.type));
  const placeProps = allProps.filter(p => p.type === 'place' || p.type === 'text');

  const updateSetting = (key: string, val: any) => updateViewSettings(view.id, { [key]: val });
  const goHome = () => setScreen(view.type === 'chart' ? 'editChart' : 'main');

  // Shared identity props
  const identityProps = {
    viewIcon, setViewIcon,
    viewName: view.name,
    onNameChange: (v: string) => updateView(view.id, { name: v }),
    onIconChange: (v: string) => updateSetting('viewIcon', v),
    viewType: view.type,
  };

  // ─────────────────────────────────────────────────────────────────────
  // FILTER SCREEN — Settings panel filter sub-screen
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'filter') {
    const filters = view.filters || [];
    return (
      <div className="flex flex-col h-full" style={{ minWidth: 290, maxWidth: 290 }}>
        <FilterSettingsSubpanel
          viewId={view.id}
          properties={database.properties}
          filters={filters}
          conjunction={view.filterConjunction || 'and'}
          onBack={() => setScreen('main')}
          onClose={onClose}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // ADD FILTER SCREEN — Property picker for adding a new filter
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'addFilter') {
    const allProps = Object.values(database.properties) as import('../types/database').SchemaProperty[];
    return (
      <div className="flex flex-col h-full" style={{ minWidth: 290, maxWidth: 290 }}>
        <FilterPropertyPicker
          properties={allProps}
          onSelect={propId => {
            const prop = database.properties[propId];
            const ops = getOperatorsForType(prop?.type || 'text');
            useDatabaseStore.getState().addFilter(view.id, { propertyId: propId, operator: ops[0].value, value: '' });
            setScreen('filter');
          }}
          onClose={() => setScreen('filter')}
          title="Add filter"
          onAdvancedFilter={() => setScreen('filter')}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // LAYOUT SCREEN — Grid + per-view-type settings
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'layout') {
    const renderLayoutSettings = () => {
      switch (view.type) {
        case 'table':
          return (
            <>
              <ToggleSettingRow label="Show vertical lines" checked={!!settings.showVerticalLines} onChange={v => updateSetting('showVerticalLines', v)} />
              <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
              <ToggleSettingRow label="Wrap all content" checked={!!settings.wrapContent} onChange={v => updateSetting('wrapContent', v)} />
              <NavSettingRow label="Group by"
                value={view.grouping ? allProps.find(p => p.id === view.grouping?.propertyId)?.name : 'None'}
                onClick={() => setScreen('groupBy')} />
              <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
            </>
          );
        case 'board':
          return (
            <>
              <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
              <ToggleSettingRow label="Wrap all content" checked={!!settings.wrapContent} onChange={v => updateSetting('wrapContent', v)} />
              <NavSettingRow label="Group by"
                value={view.grouping ? allProps.find(p => p.id === view.grouping?.propertyId)?.name : 'None'}
                onClick={() => setScreen('groupBy')} />
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
              <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
            </>
          );
        case 'list':
          return (
            <>
              <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
              <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
            </>
          );
        case 'gallery':
          return (
            <>
              <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
              <ToggleSettingRow label="Wrap all content" checked={!!settings.wrapContent} onChange={v => updateSetting('wrapContent', v)} />
              <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
              <MenuDivider />
              <NavSettingRow label="Card preview" value={settings.cardPreview || 'None'} onClick={() => setScreen('cardPreview')} />
              <NavSettingRow label="Card size" value={settings.cardSize || 'Medium'} onClick={() => setScreen('cardSize')} />
              <ToggleSettingRow label="Fit media" checked={settings.fitMedia !== false} onChange={v => updateSetting('fitMedia', v)} />
            </>
          );
        case 'chart':
          return (
            <NavSettingRow label="Edit chart" onClick={() => setScreen('editChart')} />
          );
        case 'feed':
          return (
            <>
              <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
              <ToggleSettingRow label="Wrap properties" checked={!!settings.wrapProperties} onChange={v => updateSetting('wrapProperties', v)} />
              <ToggleSettingRow label="Show author byline" checked={settings.showAuthorByline !== false} onChange={v => updateSetting('showAuthorByline', v)} />
              <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
              <NavSettingRow label="Load limit" value={String(settings.loadLimit || 50)} onClick={() => setScreen('loadLimit')} />
            </>
          );
        case 'map':
          return (
            <>
              <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
              <NavSettingRow label="Map by"
                value={settings.mapBy ? allProps.find(p => p.id === settings.mapBy)?.name : 'Place'}
                onClick={() => setScreen('mapBy')} />
              <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
            </>
          );
        case 'dashboard':
          return (
            <>
              <ToggleSettingRow label="Show page icon" checked={settings.showPageIcon !== false} onChange={v => updateSetting('showPageIcon', v)} />
              <NavSettingRow label="Open pages in" value={settings.openPagesIn || 'Side peek'} onClick={() => setScreen('openPagesIn')} />
            </>
          );
        default:
          return null;
      }
    };

    return (
      <div className="flex flex-col h-full" style={{ minWidth: 290, maxWidth: 290 }}>
        <SubPanelHeader title="Layout" onBack={goHome} onClose={onClose} />
        <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
          {/* ─── View type grid ─── */}
          <div className="px-3 pt-2">
            <div className="grid grid-cols-3 gap-2">
              {LAYOUT_ORDER.map(type => (
                <ViewTypeCard
                  key={type}
                  icon={VIEW_META[type].svgIcon}
                  label={VIEW_META[type].label}
                  active={view.type === type}
                  onClick={() => {
                    updateView(view.id, { type });
                    if (type === 'chart') setScreen('editChart');
                  }}
                />
              ))}
            </div>
          </div>

          {/* ─── Per-view-type settings ─── */}
          <div className="flex flex-col gap-px px-2 py-2">
            {renderLayoutSettings()}
          </div>

          {/* ─── Card layout picker (board / gallery) ─── */}
          {(view.type === 'board' || view.type === 'gallery') && (
            <CardLayoutPicker
              value={(settings.cardLayout || 'compact') as 'compact' | 'list'}
              onChange={v => updateSetting('cardLayout', v)}
            />
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Load limit
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'loadLimit') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Load limit" onBack={() => setScreen('layout')} onClose={onClose} />
        <OptionList
          options={[5, 10, 25, 50, 75, 100, 150].map(n => ({ id: String(n), label: n + ' pages' }))}
          activeId={String(settings.loadLimit || 50)}
          onSelect={id => { updateSetting('loadLimit', Number(id)); setScreen('layout'); }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Card preview
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'cardPreview') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Card preview" onBack={() => setScreen('layout')} onClose={onClose} />
        <OptionList
          options={[
            { id: 'none', label: 'None' },
            { id: 'page_cover', label: 'Page cover' },
            { id: 'page_properties', label: 'Page properties' },
            { id: 'page_content', label: 'Page content' },
          ]}
          activeId={settings.cardPreview || 'none'}
          onSelect={id => { updateSetting('cardPreview', id); setScreen('layout'); }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Card size
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'cardSize') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Card size" onBack={() => setScreen('layout')} onClose={onClose} />
        <OptionList
          options={[
            { id: 'small', label: 'Small' },
            { id: 'medium', label: 'Medium' },
            { id: 'large', label: 'Large' },
          ]}
          activeId={settings.cardSize || 'medium'}
          onSelect={id => { updateSetting('cardSize', id); setScreen('layout'); }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Group by
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'groupBy') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Group by" onBack={() => setScreen('layout')} onClose={onClose} />
        <div className="p-4 flex flex-col gap-1">
          <button onClick={() => { setGrouping(view.id, undefined); setScreen('layout'); }}
            className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
              !view.grouping ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
            }`}>
            None
          </button>
          {groupableProps.map(p => (
            <button key={p.id} onClick={() => { setGrouping(view.id, { propertyId: p.id }); setScreen('layout'); }}
              className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
                view.grouping?.propertyId === p.id
                  ? 'bg-accent-soft text-accent-text font-medium'
                  : 'text-ink-body hover:bg-hover-surface'
              }`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Calendar by
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'showCalendarBy') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Show calendar by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList
          properties={dateProps}
          activeId={settings.showCalendarBy || ''}
          onSelect={id => { updateSetting('showCalendarBy', id); setScreen('layout'); }}
          noneLabel="Auto (first date)"
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Calendar as
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'showCalendarAs') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Show calendar as" onBack={() => setScreen('layout')} onClose={onClose} />
        <OptionList
          options={[{ id: 'month', label: 'Month' }, { id: 'week', label: 'Week' }]}
          activeId={settings.calendarMode || 'month'}
          onSelect={id => { updateSetting('calendarMode', id); setScreen('layout'); }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Timeline by
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'showTimelineBy') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Show timeline by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList
          properties={dateProps}
          activeId={settings.showTimelineBy || ''}
          onSelect={id => { updateSetting('showTimelineBy', id); setScreen('layout'); }}
          noneLabel="Auto"
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Open pages in
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'openPagesIn') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Open pages in" onBack={() => setScreen('layout')} onClose={onClose} />
        <OptionList
          options={[
            { id: 'side_peek', label: 'Side peek' },
            { id: 'center_peek', label: 'Center peek' },
            { id: 'full_page', label: 'Full page' },
          ]}
          activeId={settings.openPagesIn || 'side_peek'}
          onSelect={id => { updateSetting('openPagesIn', id); setScreen('layout'); }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Map by
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'mapBy') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Map by" onBack={() => setScreen('layout')} onClose={onClose} />
        <PropertyOptionList
          properties={placeProps}
          activeId={settings.mapBy || ''}
          onSelect={id => { updateSetting('mapBy', id); setScreen('layout'); }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // SUB-SCREEN: Chart type
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'chartType') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Chart type" onBack={() => setScreen('editChart')} onClose={onClose} />
        <div className="p-4 grid grid-cols-2 gap-2">
          {CHART_TYPE_META.map(ct => {
            const isActive = (settings.chartType || 'vertical_bar') === ct.type;
            return (
              <button key={ct.type}
                onClick={() => { updateSetting('chartType', ct.type); setScreen('editChart'); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  isActive ? 'border-accent-border bg-accent-soft3 text-accent-text-light' : 'border-line hover:border-hover-border text-ink-secondary'
                }`}>
                <span className={isActive ? 'text-accent-text-soft' : 'text-ink-muted'}>{ct.icon}</span>
                <span className="text-xs font-medium">{ct.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // CHART AXIS SUB-SCREENS
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'xAxisWhat') {
    const eligible = allProps.filter(p => ['select', 'multi_select', 'status', 'checkbox', 'user', 'person', 'text', 'date'].includes(p.type));
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="X-Axis: What to show" onBack={() => setScreen('editChart')} onClose={onClose} />
        <PropertyOptionList properties={eligible} activeId={settings.xAxisProperty || ''} onSelect={id => { updateSetting('xAxisProperty', id); setScreen('editChart'); }} />
      </div>
    );
  }

  if (screen === 'xAxisSort') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="X-Axis: Sort by" onBack={() => setScreen('editChart')} onClose={onClose} />
        <OptionList
          options={[{ id: 'ascending', label: 'Ascending' }, { id: 'descending', label: 'Descending' }, { id: 'manual', label: 'Manual' }]}
          activeId={settings.xAxisSort || 'ascending'}
          onSelect={id => { updateSetting('xAxisSort', id); setScreen('editChart'); }}
        />
      </div>
    );
  }

  if (screen === 'yAxisWhat') {
    const eligible = allProps.filter(p => p.type === 'number');
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Y-Axis: What to show" onBack={() => setScreen('editChart')} onClose={onClose} />
        <PropertyOptionList properties={eligible} activeId={settings.yAxisProperty || ''} onSelect={id => { updateSetting('yAxisProperty', id); setScreen('editChart'); }} noneLabel="Count (all)" />
      </div>
    );
  }

  if (screen === 'yAxisGroupBy') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Y-Axis: Group by" onBack={() => setScreen('editChart')} onClose={onClose} />
        <PropertyOptionList properties={groupableProps} activeId={settings.yAxisGroupBy || ''} onSelect={id => { updateSetting('yAxisGroupBy', id); setScreen('editChart'); }} noneLabel="None" />
      </div>
    );
  }

  if (screen === 'yAxisRange') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Y-Axis: Range" onBack={() => setScreen('editChart')} onClose={onClose} />
        <OptionList
          options={[{ id: 'auto', label: 'Auto' }, { id: '0-100', label: '0 – 100' }, { id: '0-1000', label: '0 – 1,000' }, { id: 'custom', label: 'Custom' }]}
          activeId={settings.yAxisRange || 'auto'}
          onSelect={id => { updateSetting('yAxisRange', id); setScreen('editChart'); }}
        />
      </div>
    );
  }

  if (screen === 'yAxisReferenceLine') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Reference line" onBack={() => setScreen('editChart')} onClose={onClose} />
        <div className="p-4 flex flex-col gap-3">
          <Toggle label="Show reference line" checked={!!settings.showReferenceLine} onChange={v => updateSetting('showReferenceLine', v)} />
          {settings.showReferenceLine && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-secondary">Value</span>
              <input type="number" value={settings.referenceLineValue ?? ''}
                onChange={e => updateSetting('referenceLineValue', e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 border border-line rounded-lg text-sm bg-surface-primary focus:outline-none focus:ring-2 focus:ring-focus-ring-muted" placeholder="e.g. 50" />
            </label>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'colorPalette') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Color palette" onBack={() => setScreen('editChart')} onClose={onClose} />
        <OptionList
          options={['default', 'blue', 'green', 'warm', 'cool', 'pastel', 'vivid'].map(p => ({ id: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
          activeId={settings.colorPalette || 'default'}
          onSelect={id => { updateSetting('colorPalette', id); setScreen('editChart'); }}
        />
      </div>
    );
  }

  if (screen === 'moreStyle') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Style options" onBack={() => setScreen('editChart')} onClose={onClose} />
        <div className="p-4 flex flex-col gap-3">
          <Toggle label="Show legend" checked={settings.showLegend !== false} onChange={v => updateSetting('showLegend', v)} />
          <Toggle label="Show grid lines" checked={settings.showGridLines !== false} onChange={v => updateSetting('showGridLines', v)} />
          <Toggle label="Show data labels" checked={!!settings.showDataLabels} onChange={v => updateSetting('showDataLabels', v)} />
          <Toggle label="Rounded bars" checked={settings.roundedBars !== false} onChange={v => updateSetting('roundedBars', v)} />
          <Toggle label="Smooth line" checked={!!settings.smoothLine} onChange={v => updateSetting('smoothLine', v)} />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // EDIT CHART — Notion-authentic full chart settings
  // (this IS the main screen when view type is chart)
  // ─────────────────────────────────────────────────────────────────────
  if (screen === 'editChart') {
    const ct = settings.chartType || 'vertical_bar';
    const xPropName = settings.xAxisProperty
      ? allProps.find(p => p.id === settings.xAxisProperty)?.name || 'Select'
      : 'Select';
    const yPropName = settings.yAxisProperty
      ? allProps.find(p => p.id === settings.yAxisProperty)?.name
      : 'Count';
    const yGroupName = settings.yAxisGroupBy
      ? allProps.find(p => p.id === settings.yAxisGroupBy)?.name || 'None'
      : 'None';

    return (
      <div className="flex flex-col h-full" style={{ minWidth: 290, maxWidth: 290 }}>
        <SettingsHeader title="View settings" onClose={onClose} />
        <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>

          {/* ─── View Identity ─── */}
          <ViewIdentityRow {...identityProps} fallbackIcon={<ChartIcon className="w-5 h-5" />} />

          {/* ─── Layout row ─── */}
          <div className="flex flex-col gap-px px-2 pb-1">
            <SettingsRow icon={<ChartIcon className="w-5 h-5" />} label="Layout" value="Chart" onClick={() => setScreen('layout')} />
          </div>

          {/* ═══ CHART TYPE ═══ */}
          <div className="px-2 pt-1.5 relative">
            <div className="absolute top-0 inset-x-4 h-px bg-surface-tertiary" />
            <div className="flex items-center px-2 mt-1.5 mb-2">
              <span className="text-xs font-medium text-ink-secondary select-none">Chart type</span>
            </div>
            <div className="flex gap-2 mx-2 pb-1">
              {CHART_TYPE_META.map(item => {
                const isActive = ct === item.type;
                return (
                  <button key={item.type} onClick={() => updateSetting('chartType', item.type)}
                    aria-label={item.label}
                    className={`flex items-center justify-center flex-1 rounded-lg p-1.5 h-10 transition-all ${
                      isActive ? 'ring-2 ring-ring-accent-strong ring-inset' : 'ring-1 ring-ring-neutral ring-inset hover:bg-hover-surface'
                    }`}>
                    <span className={isActive ? 'text-accent-text-soft' : 'text-ink-muted'}>{item.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ X AXIS ═══ */}
          <div className="px-2 pt-1">
            <div className="flex items-center px-2 mt-1.5 mb-2">
              <span className="text-xs font-medium text-ink-secondary select-none">X axis</span>
            </div>
            <div className="flex flex-col gap-px">
              <SettingsRow icon={<ArrowTurnDownRightIcon />} label="What to show" value={xPropName} onClick={() => setScreen('xAxisWhat')} />
              <SettingsRow icon={<ArrowUpDownRotatedIcon />} label="Sort by" value={settings.xAxisSort || 'Manual'} onClick={() => setScreen('xAxisSort')} />
              <button onClick={() => updateSetting('xAxisOmitZero', !settings.xAxisOmitZero)}
                className="w-full flex items-center gap-2.5 px-2 py-[7px] text-sm rounded-md transition-colors text-ink-body hover:bg-hover-surface-soft2">
                <span className="w-5 h-5 flex items-center justify-center shrink-0 text-ink-secondary">
                  <EyeSlashIcon className="w-5 h-5" />
                </span>
                <span className="flex-1 text-left text-sm truncate">Omit zero values</span>
                <div className="shrink-0 ml-auto">
                  <ToggleSwitch checked={!!settings.xAxisOmitZero} onChange={v => updateSetting('xAxisOmitZero', v)} />
                </div>
              </button>
            </div>
          </div>

          {/* ═══ Y AXIS ═══ */}
          <div className="px-2 pt-1">
            <div className="flex items-center px-2 mt-1.5 mb-2">
              <span className="text-xs font-medium text-ink-secondary select-none">Y axis</span>
            </div>
            <div className="flex flex-col gap-px">
              <SettingsRow icon={<ArrowTurnLeftUpIcon />} label="What to show" value={yPropName || 'Count'} onClick={() => setScreen('yAxisWhat')} />
              <SettingsRow icon={<RectangleSplitIcon />} label="Group by" value={yGroupName} onClick={() => setScreen('yAxisGroupBy')} />
              <SettingsRow icon={<ArrowUpDownStackedIcon />} label="Range" value={settings.yAxisRange || 'Auto'} onClick={() => setScreen('yAxisRange')} />
              <SettingsRow icon={<DottedLineIcon />} label="Reference line"
                value={settings.showReferenceLine ? (settings.referenceLineValue ?? 0) + ' lines' : '0 lines'}
                onClick={() => setScreen('yAxisReferenceLine')} />
            </div>
          </div>

          {/* ═══ STYLE ═══ */}
          <div className="px-2 pt-1 pb-1">
            <div className="flex items-center px-2 mt-1.5 mb-2">
              <span className="text-xs font-medium text-ink-secondary select-none">Style</span>
            </div>
            <div className="flex flex-col gap-px">
              <SettingsRow icon={<PaintPaletteIcon />} label="Color" value={settings.colorPalette || 'Auto'} onClick={() => setScreen('colorPalette')} />
              <SettingsRow icon={<PaintBrushIcon />} label="More style options" onClick={() => setScreen('moreStyle')} />
            </div>
          </div>

          {/* ═══ SOURCE / FILTER ═══ */}
          <div className="px-2 pt-2 pb-1 relative">
            <div className="absolute top-0 inset-x-4 h-px bg-surface-tertiary" />
            <div className="flex flex-col gap-px pt-1">
              <SettingsRow icon={<PathRoundEndsIcon />} label="Source" value={database.name} onClick={() => {}} />
              <SettingsRow icon={<FilterIcon />} label="Filter" onClick={() => setScreen('filter')} />
            </div>
          </div>

          {/* ═══ SAVE / COPY ═══ */}
          <div className="px-2 pt-2 pb-1 relative">
            <div className="absolute top-0 inset-x-4 h-px bg-surface-tertiary" />
            <div className="flex flex-col gap-px pt-1">
              <SettingsRow icon={<ArrowLineDownIcon />} label="Save chart as..." onClick={() => {}} />
              <SettingsRow icon={<LinkIcon />} label="Copy link to view" showChevron={false} onClick={() => {}} />
            </div>
          </div>

          {/* ═══ MANAGE / LOCK ═══ */}
          <div className="px-2 pt-2 pb-1 relative">
            <div className="absolute top-0 inset-x-4 h-px bg-surface-tertiary" />
            <div className="flex flex-col gap-px pt-1">
              <SettingsRow icon={<CollectionIcon />} label="Manage data sources" onClick={() => {}} />
              <SettingsRow icon={<LockIcon />} label="Lock views" showChevron={false} onClick={() => {}} />
            </div>
          </div>

          {/* ═══ LEARN ═══ */}
          <div className="px-2 pt-2 pb-2 relative">
            <div className="absolute top-0 inset-x-4 h-px bg-surface-tertiary" />
            <div className="flex flex-col gap-px pt-1">
              <a href="https://www.notion.com/help/charts" target="_blank" rel="noopener noreferrer" className="no-underline">
                <div className="flex items-center gap-2.5 px-2 py-[7px] text-sm rounded-md transition-colors text-ink-secondary hover:bg-hover-surface-soft2 cursor-pointer">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    <QuestionMarkCircleIcon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 text-sm">Learn about charts</span>
                </div>
              </a>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SUB-SCREEN: Property visibility
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === 'propertyVisibility') {
    return (
      <div className="flex flex-col h-full">
        <SubPanelHeader title="Property visibility" onBack={() => setScreen('main')} onClose={onClose} />
        <div className="flex-1 overflow-auto p-2 flex flex-col gap-0.5">
          {allProps.map(prop => {
            const visible = view.visibleProperties.includes(prop.id);
            const iconName = prop.icon || DEFAULT_PROPERTY_ICONS[prop.type] || 'document';
            return (
              <PropertyRow
                key={prop.id}
                propId={prop.id}
                propName={prop.name}
                iconName={iconName}
                visible={visible}
                databaseId={view.databaseId}
                onToggle={() => togglePropertyVisibility(view.id, prop.id)}
                onIconChange={(name) => updateProperty(view.databaseId, prop.id, { icon: name })}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN SCREEN — Uniform settings list
  // (view-type-specific settings live in the Layout sub-panel)
  // ═══════════════════════════════════════════════════════════════════════
  const currentViewMeta = VIEW_META[view.type];
  const visibleCount = view.visibleProperties.length;

  return (
    <div className="flex flex-col h-full" style={{ minWidth: 290, maxWidth: 290 }}>
      <SettingsHeader title="View settings" onClose={onClose} />
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        <div className="flex flex-col gap-px">

          {/* ─── View Identity: icon + name input ─── */}
          <ViewIdentityRow {...identityProps} fallbackIcon={currentViewMeta.svgIcon} />

          {/* ─── View Settings Rows ─── */}
          <div className="flex flex-col gap-px px-2 py-1">
            <SettingsRow icon={currentViewMeta.svgIcon} label="Layout" value={currentViewMeta.label} onClick={() => setScreen('layout')} />
            <SettingsRow icon={<EyeIcon />} label="Property visibility" value={String(visibleCount)} onClick={() => setScreen('propertyVisibility')} />
            <SettingsRow icon={<FilterIcon />} label="Filter" onClick={() => setScreen('filter')} />
            <SettingsRow icon={<SortIcon />} label="Sort" onClick={() => {}} />
            <SettingsRow icon={<ConditionalColorIcon />} label="Conditional color" onClick={() => {}} />
            <SettingsRow icon={<CopyLinkIcon className="w-5 h-5" />} label="Copy link to view" showChevron={false} onClick={() => {}} />
          </div>

          {/* ─── Data source settings ─── */}
          <SettingsSectionLabel>Data source settings</SettingsSectionLabel>
          <div className="flex flex-col gap-px px-2 pb-2">
            <SettingsRow icon={<SourceIcon />} label="Source" value={database.name} onClick={() => {}} />
            <SettingsRow icon={<ListIcon className="w-5 h-5" />} label="Edit properties" onClick={() => {}} />
            <SettingsRow icon={<LightningIcon />} label="Automations" onClick={() => {}} />
          </div>

          {/* ─── Bottom section ─── */}
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
