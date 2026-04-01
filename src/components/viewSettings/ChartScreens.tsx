// ═══════════════════════════════════════════════════════════════════════════════
// Chart settings screens — extracted from ViewSettingsPanel
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  ChartIcon, ArrowTurnDownRightIcon, ArrowUpDownRotatedIcon,
  ArrowTurnLeftUpIcon, RectangleSplitIcon, ArrowUpDownStackedIcon,
  DottedLineIcon, PaintPaletteIcon, PaintBrushIcon, ArrowLineDownIcon,
  LinkIcon, CollectionIcon, LockIcon, QuestionMarkCircleIcon,
  FilterIcon, EyeSlashIcon, PathRoundEndsIcon,
} from '../ui/Icons';
import { SettingsHeader, SettingsRow, ToggleSwitch } from '../ui/MenuPrimitives';
import { CHART_TYPE_META } from './constants';
import { SubPanelHeader, OptionList, PropertyOptionList, Toggle, ViewIdentityRow } from './SubComponents';
import type { PanelScreen } from './constants';
import type { SchemaProperty } from '../../types/database';

export interface ChartScreensProps {
  screen: PanelScreen;
  setScreen: (s: PanelScreen) => void;
  settings: Record<string, any>;
  updateSetting: (key: string, val: any) => void;
  allProps: SchemaProperty[];
  groupableProps: SchemaProperty[];
  databaseName: string;
  onClose: () => void;
  identityProps: any;
}

export function ChartTypeScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Chart type" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className="p-4 grid grid-cols-2 gap-2">
        {CHART_TYPE_META.map(ct => {
          const isActive = (settings.chartType || 'vertical_bar') === ct.type;
          return (
            <button key={ct.type} onClick={() => { updateSetting('chartType', ct.type); setScreen('editChart'); }}
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

export function XAxisWhatScreen({ setScreen, settings, updateSetting, allProps, onClose }: ChartScreensProps) {
  const eligible = allProps.filter(p => ['select', 'multi_select', 'status', 'checkbox', 'user', 'person', 'text', 'date'].includes(p.type));
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="X-Axis: What to show" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={eligible} activeId={settings.xAxisProperty || ''} onSelect={id => { updateSetting('xAxisProperty', id); setScreen('editChart'); }} />
    </div>
  );
}

export function XAxisSortScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
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

export function YAxisWhatScreen({ setScreen, settings, updateSetting, allProps, onClose }: ChartScreensProps) {
  const eligible = allProps.filter(p => p.type === 'number');
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Y-Axis: What to show" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={eligible} activeId={settings.yAxisProperty || ''} onSelect={id => { updateSetting('yAxisProperty', id); setScreen('editChart'); }} noneLabel="Count (all)" />
    </div>
  );
}

export function YAxisGroupByScreen({ setScreen, settings, updateSetting, groupableProps, onClose }: ChartScreensProps) {
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Y-Axis: Group by" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={groupableProps} activeId={settings.yAxisGroupBy || ''} onSelect={id => { updateSetting('yAxisGroupBy', id); setScreen('editChart'); }} noneLabel="None" />
    </div>
  );
}

export function YAxisRangeScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
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

export function YAxisReferenceLineScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
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

export function ColorPaletteScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
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

export function MoreStyleScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
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

// ─── Edit Chart (main chart screen) ─────────────────────────────────────────

export function EditChartScreen(props: ChartScreensProps) {
  const { setScreen, settings, updateSetting, allProps, databaseName, onClose, identityProps } = props;
  const ct = settings.chartType || 'vertical_bar';
  const xPropName = settings.xAxisProperty ? allProps.find(p => p.id === settings.xAxisProperty)?.name || 'Select' : 'Select';
  const yPropName = settings.yAxisProperty ? allProps.find(p => p.id === settings.yAxisProperty)?.name : 'Count';
  const yGroupName = settings.yAxisGroupBy ? allProps.find(p => p.id === settings.yAxisGroupBy)?.name || 'None' : 'None';

  return (
    <div className="flex flex-col h-full" style={{ minWidth: 290, maxWidth: 290 }}>
      <SettingsHeader title="View settings" onClose={onClose} />
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        <ViewIdentityRow {...identityProps} fallbackIcon={<ChartIcon className="w-5 h-5" />} />

        <div className="flex flex-col gap-px px-2 pb-1">
          <SettingsRow icon={<ChartIcon className="w-5 h-5" />} label="Layout" value="Chart" onClick={() => setScreen('layout')} />
        </div>

        {/* Chart Type */}
        <div className="px-2 pt-1.5 relative">
          <div className="absolute top-0 inset-x-4 h-px bg-surface-tertiary" />
          <div className="flex items-center px-2 mt-1.5 mb-2">
            <span className="text-xs font-medium text-ink-secondary select-none">Chart type</span>
          </div>
          <div className="flex gap-2 mx-2 pb-1">
            {CHART_TYPE_META.map(item => {
              const isActive = ct === item.type;
              return (
                <button key={item.type} onClick={() => updateSetting('chartType', item.type)} aria-label={item.label}
                  className={`flex items-center justify-center flex-1 rounded-lg p-1.5 h-10 transition-all ${
                    isActive ? 'ring-2 ring-ring-accent-strong ring-inset' : 'ring-1 ring-ring-neutral ring-inset hover:bg-hover-surface'
                  }`}>
                  <span className={isActive ? 'text-accent-text-soft' : 'text-ink-muted'}>{item.icon}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* X Axis */}
        <ChartAxisSection title="X axis">
          <SettingsRow icon={<ArrowTurnDownRightIcon />} label="What to show" value={xPropName} onClick={() => setScreen('xAxisWhat')} />
          <SettingsRow icon={<ArrowUpDownRotatedIcon />} label="Sort by" value={settings.xAxisSort || 'Manual'} onClick={() => setScreen('xAxisSort')} />
          <button onClick={() => updateSetting('xAxisOmitZero', !settings.xAxisOmitZero)}
            className="w-full flex items-center gap-2.5 px-2 py-[7px] text-sm rounded-md transition-colors text-ink-body hover:bg-hover-surface-soft2">
            <span className="w-5 h-5 flex items-center justify-center shrink-0 text-ink-secondary"><EyeSlashIcon className="w-5 h-5" /></span>
            <span className="flex-1 text-left text-sm truncate">Omit zero values</span>
            <div className="shrink-0 ml-auto"><ToggleSwitch checked={!!settings.xAxisOmitZero} onChange={v => updateSetting('xAxisOmitZero', v)} /></div>
          </button>
        </ChartAxisSection>

        {/* Y Axis */}
        <ChartAxisSection title="Y axis">
          <SettingsRow icon={<ArrowTurnLeftUpIcon />} label="What to show" value={yPropName || 'Count'} onClick={() => setScreen('yAxisWhat')} />
          <SettingsRow icon={<RectangleSplitIcon />} label="Group by" value={yGroupName} onClick={() => setScreen('yAxisGroupBy')} />
          <SettingsRow icon={<ArrowUpDownStackedIcon />} label="Range" value={settings.yAxisRange || 'Auto'} onClick={() => setScreen('yAxisRange')} />
          <SettingsRow icon={<DottedLineIcon />} label="Reference line"
            value={settings.showReferenceLine ? (settings.referenceLineValue ?? 0) + ' lines' : '0 lines'}
            onClick={() => setScreen('yAxisReferenceLine')} />
        </ChartAxisSection>

        {/* Style */}
        <ChartAxisSection title="Style">
          <SettingsRow icon={<PaintPaletteIcon />} label="Color" value={settings.colorPalette || 'Auto'} onClick={() => setScreen('colorPalette')} />
          <SettingsRow icon={<PaintBrushIcon />} label="More style options" onClick={() => setScreen('moreStyle')} />
        </ChartAxisSection>

        {/* Source / Filter */}
        <ChartDividerSection>
          <SettingsRow icon={<PathRoundEndsIcon />} label="Source" value={databaseName} onClick={() => {}} />
          <SettingsRow icon={<FilterIcon />} label="Filter" onClick={() => setScreen('filter')} />
        </ChartDividerSection>

        {/* Save / Copy */}
        <ChartDividerSection>
          <SettingsRow icon={<ArrowLineDownIcon />} label="Save chart as..." onClick={() => {}} />
          <SettingsRow icon={<LinkIcon />} label="Copy link to view" showChevron={false} onClick={() => {}} />
        </ChartDividerSection>

        {/* Manage / Lock */}
        <ChartDividerSection>
          <SettingsRow icon={<CollectionIcon />} label="Manage data sources" onClick={() => {}} />
          <SettingsRow icon={<LockIcon />} label="Lock views" showChevron={false} onClick={() => {}} />
        </ChartDividerSection>

        {/* Learn */}
        <ChartDividerSection>
          <a href="https://www.notion.com/help/charts" target="_blank" rel="noopener noreferrer" className="no-underline">
            <div className="flex items-center gap-2.5 px-2 py-[7px] text-sm rounded-md transition-colors text-ink-secondary hover:bg-hover-surface-soft2 cursor-pointer">
              <span className="w-5 h-5 flex items-center justify-center shrink-0"><QuestionMarkCircleIcon className="w-5 h-5" /></span>
              <span className="flex-1 text-sm">Learn about charts</span>
            </div>
          </a>
        </ChartDividerSection>
      </div>
    </div>
  );
}

// ─── Tiny layout helpers ─────────────────────────────────────────────────────

function ChartAxisSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2 pt-1">
      <div className="flex items-center px-2 mt-1.5 mb-2">
        <span className="text-xs font-medium text-ink-secondary select-none">{title}</span>
      </div>
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  );
}

function ChartDividerSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-2 pb-1 relative">
      <div className="absolute top-0 inset-x-4 h-px bg-surface-tertiary" />
      <div className="flex flex-col gap-px pt-1">{children}</div>
    </div>
  );
}
