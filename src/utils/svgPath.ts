/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   svgPath.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// SVG path utilities — donut slices, arc paths, progress rings
// ═══════════════════════════════════════════════════════════════════════════════

/** Builds an SVG arc path for a donut/pie slice */
export function donutSlicePath(params: {
  cx: number;
  cy: number;
  outerR: number;
  innerR: number;
  startAngle: number;
  endAngle: number;
}): string {
  const { cx, cy, outerR, innerR, startAngle, endAngle } = params;
  const sx = cx + outerR * Math.cos(startAngle);
  const sy = cy + outerR * Math.sin(startAngle);
  const ex = cx + outerR * Math.cos(endAngle);
  const ey = cy + outerR * Math.sin(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;

  if (innerR <= 0) {
    return `M ${cx} ${cy} L ${sx} ${sy} A ${outerR} ${outerR} 0 ${large} 1 ${ex} ${ey} Z`;
  }
  const ix = cx + innerR * Math.cos(endAngle);
  const iy = cy + innerR * Math.sin(endAngle);
  const is_ = cx + innerR * Math.cos(startAngle);
  const isY = cy + innerR * Math.sin(startAngle);
  return `M ${sx} ${sy} A ${outerR} ${outerR} 0 ${large} 1 ${ex} ${ey} L ${ix} ${iy} A ${innerR} ${innerR} 0 ${large} 0 ${is_} ${isY} Z`;
}

/** Computes cumulative start angles for a sequence of donut slices */
export function computeDonutSlices(
  values: readonly number[],
  total: number,
  startOffset = -Math.PI / 2,
): Array<{ startAngle: number; endAngle: number; pct: number }> {
  const slices: Array<{ startAngle: number; endAngle: number; pct: number }> = [];
  let cumAngle = startOffset;
  for (const v of values) {
    const pct = total > 0 ? v / total : 0;
    const angle = pct * Math.PI * 2;
    slices.push({ startAngle: cumAngle, endAngle: cumAngle + angle, pct });
    cumAngle += angle;
  }
  return slices;
}

/** Builds a circular stroke-dasharray pair for a progress ring */
export function progressRingDash(
  radius: number,
  pct: number,
): { dashArray: number; dashOffset: number; circumference: number } {
  const circumference = 2 * Math.PI * radius;
  return {
    circumference,
    dashArray: circumference,
    dashOffset: circumference - (pct / 100) * circumference,
  };
}
