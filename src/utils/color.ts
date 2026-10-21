/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   color.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:15:50 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** Chart color palette — CSS custom properties, supports light/dark via tokens. */
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

/** Cycles through chart colors by index, wrapping at 10. */
export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Tailwind background+text class pairs for semantic stat/badge colors. */
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
 * Ordered stat color cycle for components that need sequential color
 * assignment without semantic meaning (e.g. KPI card grids).
 */
export const STAT_COLOR_CYCLE: ReadonlyArray<keyof typeof STAT_BG> = [
  'blue', 'purple', 'green', 'amber', 'pink', 'cyan',
] as const;

/**
 * Maps a Tailwind color token string to a dot-indicator background class.
 *
 * Matches against color keywords in the input string (e.g. "green-500"
 * maps to `bg-success`). Falls back to `bg-surface-strong` for unknown colors.
 *
 * @param optColor - A Tailwind color class string to inspect.
 * @returns A single Tailwind `bg-*` class name.
 */
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

/** Paint colour per tag family, keyed by the `<family>` of `bg-<family>-…`. */
const TAG_FAMILY_COLORS: Readonly<Record<string, string>> = {
  accent:  'var(--color-accent)',
  success: 'var(--color-success)',
  emerald: 'var(--color-emerald)',
  warning: 'var(--color-warning)',
  amber:   'var(--color-amber)',
  danger:  'var(--color-danger)',
  rose:    'var(--color-rose)',
  orange:  'var(--color-orange)',
  purple:  'var(--color-purple)',
  violet:  'var(--color-purple)',
  indigo:  'var(--color-indigo)',
  pink:    'var(--color-pink)',
  cyan:    'var(--color-cyan)',
  teal:    'var(--color-cyan)',
  surface: 'var(--color-chart-label)',
  ink:     'var(--color-chart-label)',
};

// Whole-value matches only: a value that merely starts like a colour can
// carry markup. Inside a colour function only `[0-9a-z.,% /+-]` is allowed —
// no quotes, semicolons or nested parens, so attribute break-outs, extra
// declarations and url()/expression() are all rejected.
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const CSS_VARIABLE = /^var\(--[a-z0-9-]+\)$/i;
const COLOR_KEYWORD = /^[a-z]{3,20}$/i;
const COLOR_FUNCTION = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([0-9a-z.,%\s/+-]*\)$/i;

/**
 * The CSS colour a chart, map pin or legend dot paints for a select option.
 *
 * Option colours are Tailwind class pairs (`bg-orange-surface-muted
 * text-orange-text-tag`); handed to a canvas or an SVG fill as-is they are
 * invalid and paint black. A value that already is a colour (hex, a colour
 * function, `var(--…)`, a keyword such as `green`) passes through unchanged.
 * Only a whole value matching one of those colour syntaxes passes, so the
 * result is safe to interpolate inside an HTML attribute as-is.
 *
 * Caveat: the family is read from the first `bg-`/`text-` token, so a class
 * outside the tag families above (`bg-brand-500`) returns '' and the caller's
 * palette colour is used instead of its own.
 *
 * @param optionColor - The option's `color` field.
 * @returns A CSS colour, or '' when none can be derived.
 */
export function optionColorToCss(optionColor: string | undefined): string {
  const value = optionColor?.trim() ?? '';
  if (!value) return '';
  if (HEX_COLOR.test(value) || CSS_VARIABLE.test(value) || COLOR_KEYWORD.test(value) || COLOR_FUNCTION.test(value))
    return value;
  const family = /\b(?:bg|text)-([a-z]+)-/.exec(value)?.[1];
  return (family && TAG_FAMILY_COLORS[family]) || '';
}

/**
 * Cover gradient classes for cards, used by BoardView and GalleryView.
 * Cycle with `index % CARD_COVER_GRADIENTS.length`.
 */
export const CARD_COVER_GRADIENTS: readonly string[] = [
  'bg-gradient-to-br from-gradient-blue-from to-gradient-blue-to',
  'bg-gradient-to-br from-gradient-purple-card-from to-gradient-purple-card-to',
  'bg-gradient-to-br from-gradient-green-from to-gradient-green-to',
  'bg-gradient-to-br from-gradient-orange-from to-gradient-orange-to',
  'bg-gradient-to-br from-gradient-pink-from to-gradient-pink-to',
  'bg-gradient-to-br from-gradient-cyan-from to-gradient-cyan-to',
] as const;

/** Returns the cover gradient class for a given card index, wrapping cyclically. */
export function cardCoverGradient(index: number): string {
  return CARD_COVER_GRADIENTS[index % CARD_COVER_GRADIENTS.length];
}
