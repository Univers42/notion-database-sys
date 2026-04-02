/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   iconRegistry.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:14 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:37:15 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Notion Icon Registry — 288 picker icons + 60 UI icons.
// Each entry: { d: SVG inner markup, viewBox?: override }
// All icons use viewBox="0 0 20 20" and should be rendered with fill="currentColor"
// ═══════════════════════════════════════════════════════════════════════════════

export interface IconDef {
  /** SVG inner markup — <path> elements */
  d: string;
  /** Optional viewBox override (default: "0 0 20 20") */
  viewBox?: string;
}

import { ICON_REGISTRY_A } from './iconRegistryA';
import { ICON_REGISTRY_B } from './iconRegistryB';

export const ICON_REGISTRY: Record<string, IconDef> = {
  ...ICON_REGISTRY_A,
  ...ICON_REGISTRY_B,
};

export const ICON_NAMES = Object.keys(ICON_REGISTRY);
export const PICKER_ICON_NAMES = ICON_NAMES.filter(k => !k.startsWith('ui/'));
export const UI_ICON_NAMES = ICON_NAMES.filter(k => k.startsWith('ui/'));
export const ICON_COUNT = ICON_NAMES.length;
