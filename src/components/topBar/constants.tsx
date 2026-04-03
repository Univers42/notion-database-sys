/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:46 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import {
  Table, Kanban, Calendar, Clock, List, LayoutGrid,
  BarChart3, Rss, Map, LayoutDashboard,
} from 'lucide-react';
import {
  TableIcon, BoardIcon, GalleryIcon, ListIcon, ChartIcon,
  DashboardIcon, TimelineIcon, FeedIcon, MapViewIcon, CalendarIcon,
} from '../ui/Icons';
import type { ViewType } from '../../types/database';
import { cn } from '../../utils/cn';

/** Lucide icons for view tabs */
export const VIEW_ICONS: Record<ViewType, React.ReactNode> = {
  table: <Table className={cn("w-4 h-4")} />,
  board: <Kanban className={cn("w-4 h-4")} />,
  calendar: <Calendar className={cn("w-4 h-4")} />,
  timeline: <Clock className={cn("w-4 h-4")} />,
  list: <List className={cn("w-4 h-4")} />,
  gallery: <LayoutGrid className={cn("w-4 h-4")} />,
  chart: <BarChart3 className={cn("w-4 h-4")} />,
  feed: <Rss className={cn("w-4 h-4")} />,
  map: <Map className={cn("w-4 h-4")} />,
  dashboard: <LayoutDashboard className={cn("w-4 h-4")} />,
};

/** SVG icons for view type card grid */
export const VIEW_TYPE_CARD_ICONS: Record<ViewType, React.ReactNode> = {
  table: <TableIcon />, board: <BoardIcon />, gallery: <GalleryIcon />,
  list: <ListIcon />, chart: <ChartIcon />, dashboard: <DashboardIcon />,
  timeline: <TimelineIcon />, feed: <FeedIcon />, map: <MapViewIcon />,
  calendar: <CalendarIcon />,
};

/** Grid ordering for "Add a new view" panel */
export const VIEW_TYPE_ORDER: ViewType[] = [
  'table', 'board', 'gallery', 'list', 'chart',
  'dashboard', 'timeline', 'feed', 'map', 'calendar',
];

export const VIEW_LABELS: Record<ViewType, string> = {
  table: 'Table', board: 'Board', calendar: 'Calendar', timeline: 'Timeline',
  list: 'List', gallery: 'Gallery', chart: 'Chart', feed: 'Feed',
  map: 'Map', dashboard: 'Dashboard',
};
