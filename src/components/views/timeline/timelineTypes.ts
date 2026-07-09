/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   timelineTypes.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { BarGeometry } from './TimelineViewHelpers';

/** 'create' = drawing a NEW range on a dateless record's lane. */
export type DragKind = 'move' | 'resize-left' | 'resize-right' | 'create';

export interface DragState {
  pageId: string;
  kind: DragKind;
  originDayIdx: number;
  originBar: BarGeometry;
  liveLeft: number;
  liveWidth: number;
  /** Track if user actually moved to suppress click-open */
  hasMoved: boolean;
}

export interface DatePickerState {
  pageId: string;
  anchorRect: DOMRect;
}

export const RESIZE_HANDLE_WIDTH = 10;
export const LEFT_PANEL_WIDTH = 240;
export const BAR_V_PADDING = 6; // top+bottom inside the row
export const EDGE_SCROLL_ZONE = 40; // px from viewport edge to trigger auto-scroll
export const EDGE_SCROLL_SPEED = 12; // px per frame
