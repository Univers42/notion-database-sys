/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   color.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Centralized color constants — chart palettes, stat badges, cover gradients
// ═══════════════════════════════════════════════════════════════════════════════

/** Chart color palette — CSS custom properties, supports light/dark via tokens */
export const CHART_COLORS: readonly string[] = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-chart-8)',
  'var(--color-chart-9)',
  'var(--color-chart-10)',
] as const;

/** Cycles through chart colors by index */
export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Tailwind background+text class pairs for semantic stat/badge colors */
export const STAT_BG: Readonly<Record<string, string>> = {
  blue:   'bg-accent-soft text-accent-text-light',
  purple: 'bg-purple-surface text-purple-text',
  green:  'bg-success-surface text-success-text',
  amber:  'bg-amber-surface text-amber-text',
  pink:   'bg-pink-surface text-pink-text',
  cyan:   'bg-cyan-surface text-cyan-text',
  red:    'bg-danger-surface text-danger-text',
  indigo: 'bg-indigo-surface text-indigo-text',
} as const;

/**
 * Ordered stat color cycle — for components that need sequential color assignment
 * without semantic meaning (e.g. KPI card grids)
 */
export const STAT_COLOR_CYCLE: ReadonlyArray<keyof typeof STAT_BG> = [
  'blue', 'purple', 'green', 'amber', 'pink', 'cyan',
] as const;

/** Maps a Tailwind color token string to a Tailwind dot-indicator class */
export function getDotColor(optColor: string): string {
  if (optColor.includes('green'))  return 'bg-success';
  if (optColor.includes('blue'))   return 'bg-accent';
  if (optColor.includes('red'))    return 'bg-danger';
  if (optColor.includes('yellow') || optColor.includes('amber') || optColor.includes('orange'))
    return 'bg-warning';
  if (optColor.includes('purple') || optColor.includes('violet')) return 'bg-purple';
  if (optColor.includes('pink'))   return 'bg-pink';
  if (optColor.includes('cyan')  || optColor.includes('teal'))    return 'bg-cyan';
  return 'bg-surface-strong';
}

/**
 * Cover gradient classes for cards — used in BoardView and GalleryView.
 * Order is intentional; cycle with index % CARD_COVER_GRADIENTS.length
 */
export const CARD_COVER_GRADIENTS: readonly string[] = [
  'bg-gradient-to-br from-gradient-blue-from to-gradient-blue-to',
  'bg-gradient-to-br from-gradient-purple-card-from to-gradient-purple-card-to',
  'bg-gradient-to-br from-gradient-green-from to-gradient-green-to',
  'bg-gradient-to-br from-gradient-orange-from to-gradient-orange-to',
  'bg-gradient-to-br from-gradient-pink-from to-gradient-pink-to',
  'bg-gradient-to-br from-gradient-cyan-from to-gradient-cyan-to',
] as const;

/** Returns the cover gradient class for a given card index */
export function cardCoverGradient(index: number): string {
  return CARD_COVER_GRADIENTS[index % CARD_COVER_GRADIENTS.length];
}
