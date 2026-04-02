/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 23:20:52 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// View settings — constants & metadata
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  TableIcon, BoardIcon, GalleryIcon, ListIcon, ChartIcon,
  DashboardIcon, TimelineIcon, FeedIcon, MapViewIcon, CalendarIcon,
  VerticalBarChartIcon, HorizontalBarChartIcon, LineChartIcon,
  DonutChartIcon, NumberIcon,
} from '../ui/Icons';
import type { ViewType, PropertyType } from '../../types/database';

export type PanelScreen =
  | 'main' | 'layout' | 'propertyVisibility' | 'filter' | 'addFilter'
  | 'sort' | 'addSort'
  | 'loadLimit' | 'cardPreview' | 'cardSize' | 'showCalendarBy'
  | 'showCalendarAs' | 'showTimelineBy' | 'openPagesIn' | 'groupBy'
  | 'mapBy' | 'editChart' | 'chartType' | 'xAxisWhat' | 'xAxisSort'
  | 'yAxisWhat' | 'yAxisGroupBy' | 'yAxisRange' | 'yAxisReferenceLine'
  | 'colorPalette' | 'moreStyle';

export const VIEW_META: Record<ViewType, { svgIcon: React.ReactNode; label: string }> = {
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

export const CHART_TYPE_META: { type: string; icon: React.ReactNode; label: string }[] = [
  { type: 'vertical_bar',   icon: <VerticalBarChartIcon className="w-5 h-5" />,   label: 'Vertical bar' },
  { type: 'horizontal_bar', icon: <HorizontalBarChartIcon className="w-5 h-5" />, label: 'Horizontal bar' },
  { type: 'line',           icon: <LineChartIcon className="w-5 h-5" />,           label: 'Line' },
  { type: 'donut',          icon: <DonutChartIcon className="w-5 h-5" />,          label: 'Donut' },
  { type: 'number',         icon: <NumberIcon className="w-5 h-5" />,              label: 'Number' },
];

export const LAYOUT_ORDER: ViewType[] = [
  'table', 'board', 'timeline', 'calendar', 'list',
  'gallery', 'chart', 'feed', 'map', 'dashboard',
];

export const DEFAULT_VIEW_ICONS: Record<ViewType, string> = {
  table: 'ui/table', board: 'ui/board', timeline: 'ui/timeline',
  calendar: 'ui/calendar', list: 'ui/list', gallery: 'ui/gallery',
  chart: 'ui/chart', feed: 'ui/feed', map: 'ui/map-view',
  dashboard: 'ui/dashboard',
};

export const DEFAULT_PROPERTY_ICONS: Record<PropertyType, string> = {
  title: 'document', text: 'pencil-square-outline', number: '123',
  select: 'check', multi_select: 'checkmark-list', status: 'activity-rectangle',
  date: 'calendar', checkbox: 'checkmark-square', person: 'vitruvian-man-circle',
  user: 'vitruvian-man-circle', url: 'arrow-northeast',
  email: 'exclamation-speech-bubble', phone: 'bell', files_media: 'paperclip',
  relation: 'arrows-swap-horizontal', formula: 'angle-brackets-solidus',
  rollup: 'chart-pie', button: 'cursor-click', place: 'compass',
  id: 'identification-badge', created_time: 'clock', last_edited_time: 'clock-outline',
  created_by: 'user-speech-bubble', last_edited_by: 'user-speech-bubble',
  assigned_to: 'vitruvian-man-circle', due_date: 'calendar',
  custom: 'identification-badge',
};
