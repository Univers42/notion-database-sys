/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { PropertyValue } from '../../../types/database';
export { CHART_COLORS as COLORS, STAT_BG } from '../../../utils/color';

/** Evaluated results of a single formula property across all pages. */
export interface FormulaResult {
  propId: string;
  propName: string;
  expression: string;
  results: { pageId: string; pageName: string; value: PropertyValue; error: boolean }[];
}

/** Aggregated analytics for one formula column (counts, distributions, dominant type). */
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
