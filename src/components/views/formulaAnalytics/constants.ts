/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { PropertyValue } from '../../../types/database';
export { CHART_COLORS as COLORS, STAT_BG } from '../../../utils/color';

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
