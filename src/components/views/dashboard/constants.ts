/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:27 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:57:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { format } from 'date-fns';
import type { SchemaProperty } from '../../../types/database';

export const COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)',
  'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)',
  'var(--color-chart-7)', 'var(--color-chart-8)', 'var(--color-chart-9)',
  'var(--color-chart-10)',
];

export const STAT_COLORS: ('blue' | 'purple' | 'green' | 'amber' | 'pink' | 'cyan')[] =
  ['blue', 'purple', 'green', 'amber', 'pink', 'cyan'];

function safeString(val: unknown): string {
  if (val !== null && typeof val === 'object') return JSON.stringify(val);
  return String(val as string | number | boolean);
}

export function formatNumber(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 10_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

export function formatCellValue(val: unknown, prop: SchemaProperty): string {
  if (val === undefined || val === null || val === '') return '—';
  if (prop.type === 'number') return Number(val).toLocaleString();
  if (prop.type === 'select' || prop.type === 'status') {
    const opt = prop.options?.find(o => o.id === val);
    return opt?.value || safeString(val);
  }
  if (prop.type === 'date') {
    try { return format(new Date(val as string), 'MMM d, yyyy'); } catch { return safeString(val); }
  }
  if (prop.type === 'checkbox') return val ? '✓' : '—';
  return safeString(val);
}

/** Catmull-Rom → cubic bezier smooth curve path builder */
export function smoothLine(pts: { x: number; y: number }[]): string {
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
