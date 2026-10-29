// ─── chartLayout — size-driven layout decisions shared by the chart bodies ──
// Caveat: label width is estimated at ~6.5px/char (11px UI font); wide glyphs
// (CJK, capitals) can overflow and wrap to a second line, never ellipsize early.

const CHAR_PX = 6.5;
const SIDE_LEGEND_MIN_WIDTH = 360;
// Above this many rows a horizontal chart in the shortest preset overlaps labels.
const MAX_HORIZONTAL_ROWS = 12;

function longest(labels: readonly string[]): number {
  return labels.reduce((m, l) => Math.max(m, l.length), 0);
}

/** Vertical bars turn horizontal when their labels would not fit a band. */
export function prefersHorizontalBars(
  labels: readonly string[], width: number, requested: boolean,
): boolean {
  if (requested) return true;
  if (width <= 0 || labels.length < 2 || labels.length > MAX_HORIZONTAL_ROWS) return false;
  const band = width / labels.length;
  return longest(labels) * CHAR_PX + 8 > band;
}

/** Category-axis width of a horizontal chart: fits the longest label, capped. */
export function categoryAxisWidth(labels: readonly string[], width: number): number {
  const wanted = longest(labels) * CHAR_PX + 12;
  const cap = width > 0 ? width * 0.4 : 160;
  return Math.round(Math.max(72, Math.min(wanted, cap)));
}

/** A wide widget lists the donut's slices beside it; a narrow one stacks them. */
export function donutLegendOnSide(width: number, height: number): boolean {
  return width >= SIDE_LEGEND_MIN_WIDTH && width > height * 1.2;
}

/** "42%" share of a total; "<1%" for a sliver, empty total is "0%". */
export function sharePercent(value: number, total: number): string {
  if (!(total > 0) || !(value > 0)) return '0%';
  const pct = (value / total) * 100;
  return pct < 1 ? '<1%' : `${Math.round(pct)}%`;
}
