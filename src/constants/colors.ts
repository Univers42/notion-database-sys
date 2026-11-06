/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   colors.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:54 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:39:55 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Random-color helpers shared by Select / MultiSelect editors
// ═══════════════════════════════════════════════════════════════════════════════

/** Semantic color keys for newly generated select / multi-select options. */
export const TAG_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
  'orange',
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

/** Pick a random semantic color from the palette. */
export function randomTagColor(): TagColor {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

/** Lookup mapping semantic color keys to client Tailwind badge classes. */
export const SEMANTIC_TAG_CLASSES: Readonly<Record<string, string>> = {
  red: 'bg-danger-surface-muted text-danger-text-tag',
  blue: 'bg-accent-muted text-accent-text-bold',
  green: 'bg-success-surface-muted text-success-text-tag',
  yellow: 'bg-warning-surface-muted text-warning-text-tag',
  purple: 'bg-purple-surface-muted text-purple-text-tag',
  pink: 'bg-pink-surface-muted text-pink-text-tag',
  cyan: 'bg-cyan-surface-muted text-cyan-text-tag',
  orange: 'bg-orange-surface-muted text-orange-text-tag',
  gray: 'bg-surface-muted text-ink-secondary',
  brown: 'bg-surface-muted text-ink-secondary',
  default: 'bg-surface-muted text-ink-body',
};

/**
 * Resolves an option's color (whether a semantic key like 'red', or a legacy Tailwind string)
 * into a CSS class pair for badge rendering.
 */
export function tagColorClass(color?: string | null): string {
  if (!color) return SEMANTIC_TAG_CLASSES.default;
  const trimmed = color.trim();
  if (!trimmed) return SEMANTIC_TAG_CLASSES.default;
  return SEMANTIC_TAG_CLASSES[trimmed.toLowerCase()] ?? trimmed;
}
