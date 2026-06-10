/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartPalette.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── chartPalette — palette registry + color-by-value shading ───────────────

import { CHART_COLORS } from '../../../utils/color';

/** Named palettes offered by the Color settings screen. */
const PALETTES: Record<string, readonly string[]> = {
  default: CHART_COLORS,
  blue:   ['#2383e2', '#5aa2e8', '#8cc0ef', '#bcd9f5', '#1668b8', '#0f4c8a', '#7fb6ec', '#3b8de5'],
  green:  ['#0f9d58', '#41b378', '#74c899', '#a8ddbb', '#0b7a44', '#076031', '#5dbd8a', '#27a868'],
  warm:   ['#e8590c', '#f08c00', '#fab005', '#e64980', '#d9480f', '#c2255c', '#f76707', '#fcc419'],
  cool:   ['#1098ad', '#4263eb', '#7048e8', '#0ca678', '#1971c2', '#5f3dc4', '#0b7285', '#3bc9db'],
  pastel: ['#a5d8ff', '#b2f2bb', '#ffd8a8', '#fcc2d7', '#d0bfff', '#99e9f2', '#ffec99', '#eebefa'],
  vivid:  ['#e03131', '#1c7ed6', '#37b24d', '#f59f00', '#9c36b5', '#0c8599', '#e8590c', '#66a80f'],
};

/** Hue used per palette when shading by value ("darker = higher"). */
const PALETTE_HUE: Record<string, number> = {
  default: 210, blue: 210, green: 150, warm: 25, cool: 200, pastel: 280, vivid: 350,
};

/** Returns the color list for a palette name (default when unknown). */
export function paletteColors(name?: string): readonly string[] {
  return PALETTES[name ?? 'default'] ?? PALETTES.default;
}

/** Stable indexed color from a palette. */
export function colorAt(palette: string | undefined, index: number): string {
  const colors = paletteColors(palette);
  return colors[((index % colors.length) + colors.length) % colors.length];
}

/**
 * Color-by-value shade: t in [0,1] (0 = smallest value, 1 = largest)
 * maps light → dark within the palette's hue, matching Notion's
 * "darker as values increase" behaviour.
 */
export function valueShade(palette: string | undefined, t: number): string {
  const hue = PALETTE_HUE[palette ?? 'default'] ?? 210;
  const clamped = Math.max(0, Math.min(1, t));
  const lightness = 82 - clamped * 47; // 82% → 35%
  return `hsl(${hue}, 65%, ${lightness}%)`;
}
