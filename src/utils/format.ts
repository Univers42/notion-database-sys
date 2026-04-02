/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   format.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:15:55 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { format, parseISO, isValid } from 'date-fns';
import type { SchemaProperty, PropertyValue } from '../types/database';

/**
 * Formats a number into a compact human-readable string.
 *
 * @example
 * formatNumber(1400000) // => "1.4M"
 * formatNumber(12000)   // => "12.0K"
 * formatNumber(999)     // => "999"
 */
export function formatNumber(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 10_000)   return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

/**
 * Formats an ISO string or Date into full date+time display.
 *
 * @returns Formatted string like "Jan 5, 2026 3:42 PM", or "—" on failure.
 */
export function formatDateTime(isoOrDate: string | Date | undefined): string {
  if (!isoOrDate) return '—';
  try {
    const d = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate;
    if (!isValid(d)) return '—';
    return format(d, 'MMM d, yyyy h:mm a');
  } catch {
    return '—';
  }
}

/**
 * Formats an ISO string or Date into short date display.
 *
 * @returns Formatted string like "Jan 5, 2026", or "—" on failure.
 */
export function formatDate(isoOrDate: string | Date | undefined): string {
  if (!isoOrDate) return '—';
  try {
    const d = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate;
    if (!isValid(d)) return '—';
    return format(d, 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

/**
 * Formats an ISO string or Date into compact month+day.
 *
 * @returns Formatted string like "Jan 5", or empty string on failure.
 */
export function formatShortDate(isoOrDate: string | Date | undefined): string {
  if (!isoOrDate) return '';
  try {
    const d = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate;
    if (!isValid(d)) return '';
    return format(d, 'MMM d');
  } catch {
    return '';
  }
}

/**
 * Renders a property value as a plain-text string suitable for display.
 *
 * Handles type-specific formatting: numbers get `toLocaleString()`,
 * selects resolve to their label via `prop.options`, dates use `formatDate`,
 * checkboxes become "✓" or "—". Falls back to `String(val)` for unknown types.
 *
 * @param val  - The raw property value from a page's properties map.
 * @param prop - The schema definition for this property (provides type and options).
 * @returns Human-readable string, or "—" for empty/null values.
 */
export function formatCellValue(val: PropertyValue, prop: SchemaProperty): string {
  if (val === undefined || val === null || val === '') return '—';
  if (prop.type === 'number') return Number(val).toLocaleString();
  if (prop.type === 'select' || prop.type === 'status') {
    const opt = prop.options?.find(o => o.id === val);
    return opt?.value ?? String(val);
  }
  if (prop.type === 'date') return formatDate(String(val));
  if (prop.type === 'checkbox') return val ? '✓' : '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/**
 * Converts a point sequence into a smooth cubic Bézier SVG path string
 * via Catmull-Rom spline interpolation.
 *
 * Pure function with no DOM access. The control points are derived from
 * neighboring points using 1/6 tangent scaling for natural curvature.
 *
 * @param pts - Ordered array of {x, y} points. Needs >= 2 for a valid path.
 * @returns SVG path `d` attribute string, or empty string if fewer than 2 points.
 */
export function smoothLine(pts: ReadonlyArray<{ x: number; y: number }>): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x} ${pts[0].y} L${pts[1].x} ${pts[1].y}`;
  let path = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}
