# Hand-Rolled SVG Math

## Why No Charting Library?

D3, Recharts, Chart.js — they all add 30-100KB (gzipped) to the bundle. Our charts need exactly three things:

1. Donut/pie slices
2. Smooth line paths
3. Progress rings

That's ~120 lines of trigonometry. Not worth a dependency.

## Donut Slice Paths

A donut slice is an SVG `<path>` shaped like a ring segment. It's defined by an outer arc, a line to the inner radius, an inner arc (reversed), and a closing line.

```ts
export function donutSlicePath(
  cx: number, cy: number,        // center
  r1: number, r2: number,        // inner and outer radii
  startAngle: number,            // start angle in radians
  endAngle: number,              // end angle in radians
): string {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  // Outer arc endpoints
  const x1 = cx + r2 * Math.cos(startAngle);
  const y1 = cy + r2 * Math.sin(startAngle);
  const x2 = cx + r2 * Math.cos(endAngle);
  const y2 = cy + r2 * Math.sin(endAngle);

  // Inner arc endpoints (reverse direction)
  const x3 = cx + r1 * Math.cos(endAngle);
  const y3 = cy + r1 * Math.sin(endAngle);
  const x4 = cx + r1 * Math.cos(startAngle);
  const y4 = cy + r1 * Math.sin(startAngle);

  return [
    `M ${x1},${y1}`,                                    // Move to outer start
    `A ${r2},${r2} 0 ${largeArc} 1 ${x2},${y2}`,       // Outer arc (clockwise)
    `L ${x3},${y3}`,                                     // Line to inner end
    `A ${r1},${r1} 0 ${largeArc} 0 ${x4},${y4}`,       // Inner arc (counter-clockwise)
    'Z',                                                  // Close path
  ].join(' ');
}
```

The `largeArc` flag tells SVG whether to take the short way or the long way around. For slices > 180°, you need the large arc.

### Computing Slices from Data

```ts
export function computeDonutSlices(values: number[], cx, cy, r1, r2) {
  const total = values.reduce((s, v) => s + v, 0);
  let currentAngle = -Math.PI / 2;  // Start at 12 o'clock

  return values.map((value) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    const path = donutSlicePath(cx, cy, r1, r2, currentAngle, currentAngle + sliceAngle);
    currentAngle += sliceAngle;
    return { path, percentage: value / total };
  });
}
```

Start at `-π/2` (top of the circle, not right side) to match the convention of clocks and pie charts.

## Progress Ring (stroke-dasharray)

For circular progress indicators, you don't need a path — just a circle with a dashed stroke:

```ts
export function progressRingDash(
  radius: number,
  fraction: number,  // 0 to 1
): { dashArray: string; dashOffset: number } {
  const circumference = 2 * Math.PI * radius;
  return {
    dashArray: `${circumference}`,
    dashOffset: circumference * (1 - fraction),
  };
}
```

Usage:
```tsx
const { dashArray, dashOffset } = progressRingDash(40, 0.75);
<circle
  r={40} cx={50} cy={50}
  fill="none"
  stroke="currentColor"
  strokeWidth={4}
  strokeDasharray={dashArray}
  strokeDashoffset={dashOffset}
  transform="rotate(-90 50 50)"  // Start from top
/>
```

The trick: a circle with a dash pattern equal to its circumference shows as a full circle. Setting `dashOffset` to 25% of the circumference hides 25% of the stroke → 75% filled.

## Catmull-Rom Splines for Smooth Lines

Line charts need smooth curves through data points. Catmull-Rom splines pass through every control point (unlike cubic Bézier, which treats them as attractors).

```ts
export function smoothLine(points: [number, number][]): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`;

  // Catmull-Rom → cubic Bézier conversion
  let d = `M${points[0][0]},${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }

  return d;
}
```

The `/ 6` factor controls curve tension. Larger denominator → tighter curves. `6` gives a natural-looking smoothness without overshooting.

## When to Reach for a Library

If you need:
- Axes with tick marks and labels → consider D3-axis (tiny standalone module)
- Responsive resizing → you'll write a `ResizeObserver` wrapper anyway
- Tooltips → just position a `<div>` at the mouse event coordinates
- Animations → use CSS transitions on SVG attributes or the Motion library (already a dependency)

If you need interactive brushing, zooming, or geographic projections — then yes, bring in D3. Those are genuinely complex.

## References

- [MDN — SVG Paths Tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths) — Complete guide to SVG `<path>` commands (M, L, A, C, Q) used in donut slices and progress rings.
- [Wikipedia — Centripetal Catmull–Rom Spline](https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline) — The mathematical foundation for the `smoothLine` function that converts discrete points into smooth curves.
- [MDN — SVG `<circle>` and `stroke-dasharray`](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray) — The technique behind `progressRingDash` for circular progress indicators.
