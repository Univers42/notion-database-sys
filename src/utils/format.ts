/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   format.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Centralized formatting utilities — numbers, dates, cell display, SVG paths
// ═══════════════════════════════════════════════════════════════════════════════

import { format, parseISO, isValid } from 'date-fns';
import type { SchemaProperty, PropertyValue } from '../types/database';

/** Compact human-readable number: 1400000 → "1.4M", 12000 → "12K" */
export function formatNumber(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 10_000)   return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

/** Full date+time display: "Jan 5, 2026 3:42 PM" */
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

/** Short date display: "Jan 5, 2026" */
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

/** Compact date: "Jan 5" */
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
 * Display a property value as a human-readable string.
 * Used by dashboard table widgets and any context needing a plain-text cell value.
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
 * Catmull-Rom spline → cubic Bézier SVG path string.
 * Pure function: no DOM access. Used by all SVG chart components.
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
