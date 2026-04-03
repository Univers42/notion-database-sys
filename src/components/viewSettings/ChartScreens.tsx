/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartScreens.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:58 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Chart settings screens — barrel + EditChartScreen (main chart screen)
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
import { ViewIdentityRow } from './SubComponents';

// Re-export sub-screens so existing consumers keep working via this module
export {
  ChartTypeScreen, XAxisWhatScreen, XAxisSortScreen,
  YAxisWhatScreen, YAxisGroupByScreen, YAxisRangeScreen,
  YAxisReferenceLineScreen, ColorPaletteScreen, MoreStyleScreen,
} from './ChartSubScreens';
export type { ChartScreensProps } from './ChartSubScreens';

import type { ChartScreensProps } from './ChartSubScreens';
import { cn } from '../../utils/cn';

// ─── Edit Chart (main chart screen) ─────────────────────────────────────────

export function EditChartScreen(props: ChartScreensProps) {
  const { setScreen, settings, updateSetting, allProps, databaseName, onClose, identityProps } = props;
  const ct = settings.chartType || 'vertical_bar';
  const xPropName = settings.xAxisProperty ? allProps.find(p => p.id === settings.xAxisProperty)?.name || 'Select' : 'Select';
  const yPropName = settings.yAxisProperty ? allProps.find(p => p.id === settings.yAxisProperty)?.name : 'Count';
  const yGroupName = settings.yAxisGroupBy ? allProps.find(p => p.id === settings.yAxisGroupBy)?.name || 'None' : 'None';

  return (
    <div className={cn("flex flex-col h-full")} style={{ minWidth: 290, maxWidth: 290 }}>
      <SettingsHeader title="View settings" onClose={onClose} />
      <div className={cn("flex-1 overflow-auto")} style={{ minHeight: 0 }}>
        <ViewIdentityRow {...identityProps} fallbackIcon={<ChartIcon className={cn("w-5 h-5")} />} />

        <div className={cn("flex flex-col gap-px px-2 pb-1")}>
          <SettingsRow icon={<ChartIcon className={cn("w-5 h-5")} />} label="Layout" value="Chart" onClick={() => setScreen('layout')} />
        </div>

        {/* Chart Type */}
        <div className={cn("px-2 pt-1.5 relative")}>
          <div className={cn("absolute top-0 inset-x-4 h-px bg-surface-tertiary")} />
          <div className={cn("flex items-center px-2 mt-1.5 mb-2")}>
            <span className={cn("text-xs font-medium text-ink-secondary select-none")}>Chart type</span>
          </div>
          <div className={cn("flex gap-2 mx-2 pb-1")}>
            {CHART_TYPE_META.map(item => {
              const isActive = ct === item.type;
              return (
                <button key={item.type} onClick={() => updateSetting('chartType', item.type)} aria-label={item.label}
                  className={cn(`flex items-center justify-center flex-1 rounded-lg p-1.5 h-10 transition-all ${
                    isActive ? 'ring-2 ring-ring-accent-strong ring-inset' : 'ring-1 ring-ring-neutral ring-inset hover:bg-hover-surface'
                  }`)}>
                  <span className={cn(isActive ? 'text-accent-text-soft' : 'text-ink-muted')}>{item.icon}</span>
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
            className={cn("w-full flex items-center gap-2.5 px-2 py-[7px] text-sm rounded-md transition-colors text-ink-body hover:bg-hover-surface-soft2")}>
            <span className={cn("w-5 h-5 flex items-center justify-center shrink-0 text-ink-secondary")}><EyeSlashIcon className={cn("w-5 h-5")} /></span>
            <span className={cn("flex-1 text-left text-sm truncate")}>Omit zero values</span>
            <div className={cn("shrink-0 ml-auto")}><ToggleSwitch checked={!!settings.xAxisOmitZero} onChange={v => updateSetting('xAxisOmitZero', v)} /></div>
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
          <a href="https://www.notion.com/help/charts" target="_blank" rel="noopener noreferrer" className={cn("no-underline")}>
            <div className={cn("flex items-center gap-2.5 px-2 py-[7px] text-sm rounded-md transition-colors text-ink-secondary hover:bg-hover-surface-soft2 cursor-pointer")}>
              <span className={cn("w-5 h-5 flex items-center justify-center shrink-0")}><QuestionMarkCircleIcon className={cn("w-5 h-5")} /></span>
              <span className={cn("flex-1 text-sm")}>Learn about charts</span>
            </div>
          </a>
        </ChartDividerSection>
      </div>
    </div>
  );
}

// ─── Tiny layout helpers ─────────────────────────────────────────────────────

function ChartAxisSection({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className={cn("px-2 pt-1")}>
      <div className={cn("flex items-center px-2 mt-1.5 mb-2")}>
        <span className={cn("text-xs font-medium text-ink-secondary select-none")}>{title}</span>
      </div>
      <div className={cn("flex flex-col gap-px")}>{children}</div>
    </div>
  );
}

function ChartDividerSection({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={cn("px-2 pt-2 pb-1 relative")}>
      <div className={cn("absolute top-0 inset-x-4 h-px bg-surface-tertiary")} />
      <div className={cn("flex flex-col gap-px pt-1")}>{children}</div>
    </div>
  );
}
