/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   svgPath.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:15:29 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Builds an SVG arc path string for a single donut or pie slice.
 *
 * Angles follow the SVG/canvas convention: 0 = right, values increase
 * clockwise. Start at `-Math.PI / 2` for a 12-o'clock origin.
 * When `innerR` is 0, produces a pie wedge (M center L start-arc Z).
 * When `innerR` > 0, produces a donut slice (outer arc + inner arc reversed).
 *
 * @param params.cx         - Center X coordinate.
 * @param params.cy         - Center Y coordinate.
 * @param params.outerR     - Outer radius in SVG units.
 * @param params.innerR     - Inner radius. Pass 0 for a solid pie slice.
 * @param params.startAngle - Start angle in radians.
 * @param params.endAngle   - End angle in radians. Must be > startAngle.
 * @returns SVG path `d` attribute string.
 *
 * @example
 * const d = donutSlicePath({ cx: 50, cy: 50, outerR: 40, innerR: 25,
 *   startAngle: -Math.PI / 2, endAngle: 0 });
 */
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

/**
 * Computes cumulative arc slices for a sequence of values.
 *
 * Each slice gets a start/end angle proportional to its share of the total.
 * Useful for building donut or pie charts from raw data.
 *
 * @param values      - Array of numeric values (one per slice).
 * @param total       - Sum of all values (denominator for percentage).
 * @param startOffset - Angle offset in radians. Default `-π/2` (12 o'clock).
 * @returns Array of `{ startAngle, endAngle, pct }` for each slice.
 */
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

/**
 * Builds stroke-dasharray parameters for a circular progress ring.
 *
 * @param radius - Ring radius in SVG units.
 * @param pct    - Fill percentage (0–100).
 * @returns Object with `dashArray`, `dashOffset`, and `circumference`.
 */
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
