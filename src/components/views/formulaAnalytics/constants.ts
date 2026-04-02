/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { PropertyValue } from '../../../types/database';

// ─── COLORS & PALETTE ──────────────────────────────────────────────────────
export const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)', 'var(--color-chart-7)', 'var(--color-chart-8)', 'var(--color-chart-9)', 'var(--color-chart-10)'];
export const STAT_BG: Record<string, string> = {
  blue: 'bg-accent-soft text-accent-text-light',
  purple: 'bg-purple-surface text-purple-text',
  green: 'bg-success-surface text-success-text',
  amber: 'bg-amber-surface text-amber-text',
  pink: 'bg-pink-surface text-pink-text',
  cyan: 'bg-cyan-surface text-cyan-text',
  red: 'bg-danger-surface text-danger-text',
  indigo: 'bg-indigo-surface text-indigo-text',
};

// ─── TYPES ──────────────────────────────────────────────────────────────────
export interface FormulaResult {
  propId: string;
  propName: string;
  expression: string;
  results: { pageId: string; pageName: string; value: PropertyValue; error: boolean }[];
}

export interface AnalyticsEntry {
  propName: string;
  expression: string;
  total: number;
  errors: number;
  numValues: number[];
  textValues: Record<string, number>;
  boolTrue: number;
  boolFalse: number;
  resultType: 'number' | 'text' | 'boolean' | 'mixed';
}
