/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   geometry.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:16:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** Application z-index layer system — all z values must come from here */
export const Z = {
  /** Regular dropdowns and small menus */
  DROPDOWN:    50,
  /** Page modals (PageModal, side peek, center peek) */
  MODAL:       60,
  /** Property config panels, relation/rollup editors */
  PANEL:       70,
  /** Portal-based cell editors (select, multiselect) */
  CELL_EDITOR: 9999,
  /** Cell editor backdrop (sits just below the editor) */
  CELL_BACKDROP: 9998,
  /** Formula/date picker backdrop */
  PICKER:      10000,
  /** Picker dropdown inside a picker (format, remind selectors) */
  PICKER_INNER: 10001,
  /** InlineToolbar floating over contentEditable */
  TOOLBAR:     10000,
  /** SlashCommandMenu */
  SLASH_MENU:  9999,
} as const;

/** Standard panel widths used across the settings/config panel system */
export const PANEL_WIDTH = {
  /** Property config, rollup editor */
  NARROW:  280,
  /** Relation editor, rollup editor (standard) */
  MEDIUM:  290,
  /** View settings panel */
  SETTINGS: 290,
  /** Relation cell editor (expanded) */
  WIDE:    340,
  /** Formula editor full panel */
  FORMULA: 920,
  /** Max width for any relation cell editor */
  RELATION_MAX: 560,
} as const;

/**
 * Clamps a panel position so it stays within the visible viewport.
 *
 * @param top         - Desired top offset in CSS pixels.
 * @param left        - Desired left offset in CSS pixels.
 * @param panelHeight - Expected panel height for bottom-edge clamping. Default 400.
 * @param panelWidth  - Expected panel width for right-edge clamping.
 * @returns `{ top, left }` clamped to the current window dimensions.
 */
export function clampPanelPosition(
  top: number,
  left: number,
  panelHeight = 400,
  panelWidth = PANEL_WIDTH.NARROW,
): { top: number; left: number } {
  return {
    top:  Math.min(top,  window.innerHeight - panelHeight),
    left: Math.min(left, window.innerWidth  - panelWidth),
  };
}

/**
 * Positions a panel below an anchor rect, clamped to the viewport.
 *
 * @param anchorRect - Bounding rect of the element the panel anchors to.
 * @param panelWidth - Expected panel width for right-edge clamping.
 * @param gap        - Vertical gap between anchor bottom and panel top. Default 4.
 * @returns `{ top, left }` in viewport-relative CSS pixels.
 */
export function positionBelowAnchor(
  anchorRect: DOMRect,
  panelWidth = PANEL_WIDTH.NARROW,
  gap = 4,
): { top: number; left: number } {
  return clampPanelPosition(anchorRect.bottom + gap, anchorRect.left, 400, panelWidth);
}
