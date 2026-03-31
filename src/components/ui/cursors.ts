// ═══════════════════════════════════════════════════════════════════════════════
// Cursor Utility — CSS custom cursor styles from the SVG Icon Registry
// Generates data-URI cursors for use as `style={{ cursor: CURSORS.xxx }}`
// ═══════════════════════════════════════════════════════════════════════════════

import { ICON_REGISTRY } from './iconRegistry';

/** Build a complete SVG string from an icon registry entry */
function buildCursorSVG(name: string, size = 24, color = 'var(--color-ink-strong)'): string {
  const icon = ICON_REGISTRY[name];
  if (!icon) return '';
  const vb = icon.viewBox || '0 0 20 20';
  // Replace currentColor with the actual color for data URI usage
  const markup = icon.d.replace(/currentColor/g, color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size}" fill="${color}">${markup}</svg>`;
}

/** Encode an SVG string as a CSS cursor value with hotspot + fallback */
function encodeCursor(svg: string, hotX: number, hotY: number, fallback: string): string {
  if (!svg) return fallback;
  const encoded = svg
    .replace(/"/g, "'")
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ');
  return `url("data:image/svg+xml,${encoded}") ${hotX} ${hotY}, ${fallback}`;
}

/** Get a CSS cursor value from an icon registry name */
export function getCursorStyle(
  name: string,
  opts?: { size?: number; color?: string; hotX?: number; hotY?: number; fallback?: string },
): string {
  const size = opts?.size ?? 24;
  const svg = buildCursorSVG(name, size, opts?.color ?? 'var(--color-ink-strong)');
  if (!svg) return opts?.fallback ?? 'auto';
  return encodeCursor(svg, opts?.hotX ?? 0, opts?.hotY ?? 0, opts?.fallback ?? 'auto');
}

// ─── Pre-built cursor styles ─────────────────────────────────────────────────
// Use these as `style={{ cursor: CURSORS.pointer }}` on any element

export const CURSORS = {
  /** Classic arrow pointer */
  default: getCursorStyle('cursor/default', { hotX: 4, hotY: 2, fallback: 'default' }),
  /** Hand pointer for clickable items */
  pointer: getCursorStyle('cursor/pointer', { hotX: 9, hotY: 4, fallback: 'pointer' }),
  /** I-beam for text editing */
  text: getCursorStyle('cursor/text', { hotX: 10, hotY: 10, fallback: 'text' }),
  /** Crosshair for precision / cell selection */
  crosshair: getCursorStyle('cursor/crosshair', { hotX: 10, hotY: 10, fallback: 'crosshair' }),
  /** Open hand for grabbable elements */
  grab: getCursorStyle('cursor/grab', { hotX: 10, hotY: 8, fallback: 'grab' }),
  /** Closed hand during active drag */
  grabbing: getCursorStyle('cursor/grabbing', { hotX: 10, hotY: 10, fallback: 'grabbing' }),
  /** Left-right arrows for column resize */
  colResize: getCursorStyle('cursor/col-resize', { hotX: 10, hotY: 10, fallback: 'col-resize' }),
  /** Up-down arrows for row resize */
  rowResize: getCursorStyle('cursor/row-resize', { hotX: 10, hotY: 10, fallback: 'row-resize' }),
  /** Four-directional arrows for move */
  move: getCursorStyle('cursor/move', { hotX: 10, hotY: 10, fallback: 'move' }),
  /** Prohibited circle */
  notAllowed: getCursorStyle('cursor/not-allowed', { hotX: 10, hotY: 10, fallback: 'not-allowed' }),
  /** Plus for cell fill / selection */
  cell: getCursorStyle('cursor/cell', { hotX: 10, hotY: 10, fallback: 'cell' }),
  /** Arrow + plus for copy / fill operation */
  copy: getCursorStyle('cursor/copy', { hotX: 4, hotY: 2, fallback: 'copy' }),
} as const;

export type CursorName = keyof typeof CURSORS;
