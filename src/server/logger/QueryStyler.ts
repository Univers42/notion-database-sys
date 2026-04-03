// ─── QueryStyler — styled query formatter ────────────────────────────────────
// Formats QueryEvents into beautiful terminal output.
// Two modes: normal (compact one-liner) and verbose (boxed detail view).
// Inspired by libcpp's TermWriter/TermStyle rendering.

import type { QueryEvent, Verbosity } from './types';
import {
  badge, sourceTag, tableName, dimText, affectedTag, timestamp,
  Box, hr, bordered, indentQuery, Palette, getOpStyle,
} from './theme';

// ─── ANSI helpers ────────────────────────────────────────────────────────────
const ESC = '\x1b[';
const RST = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM  = `${ESC}2m`;

function fg24(hex: string): string {
  const h = hex.replace('#', '');
  return `${ESC}38;2;${parseInt(h.slice(0, 2), 16)};${parseInt(h.slice(2, 4), 16)};${parseInt(h.slice(4, 6), 16)}m`;
}

// ─── Box width ───────────────────────────────────────────────────────────────
const BOX_WIDTH = 72;

// ═══════════════════════════════════════════════════════════════════════════════
//  Normal mode — compact one-liner per query
// ═══════════════════════════════════════════════════════════════════════════════

function formatNormal(evt: QueryEvent): string {
  const ts  = timestamp(evt.ts);
  const src = sourceTag(evt.source);
  const op  = badge(evt.operation);
  const tbl = tableName(evt.table);
  const aff = affectedTag(evt.affected, evt.operation);

  // Extract first meaningful line of query (skip comments)
  const firstLine = evt.query.split('\n')
    .find(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    ?? evt.query.split('\n')[0] ?? '';

  const preview = firstLine.length > 50
    ? firstLine.slice(0, 50) + '…'
    : firstLine;

  const previewStyled = preview
    ? `${fg24(Palette.subtle)}${DIM}→ ${preview}${RST}`
    : '';

  return `${ts} ${op} ${src} ${tbl}  ${aff}  ${previewStyled}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Verbose mode — boxed detail view (inspired by libcpp::TermWriter callout)
// ═══════════════════════════════════════════════════════════════════════════════

function formatVerbose(evt: QueryEvent): string {
  const st = getOpStyle(evt.operation);
  const borderColor = fg24(Palette.overlay);

  // ┌─ UPDATE ─────────────────────────────────────────────
  const headerText = ` ${evt.operation} `;
  const headerPad  = BOX_WIDTH - headerText.length - 2;
  const topLine = `${borderColor}${Box.tl}${Box.h}${RST}${st.accent}${BOLD}${headerText}${RST}${borderColor}${Box.h.repeat(Math.max(0, headerPad))}${RST}`;

  // │ source: json  │  table: tasks  │  14:30:05.123
  const metaLine = bordered(
    `${dimText('source:')} ${fg24(Palette.text)}${BOLD}${evt.source}${RST}  ` +
    `${fg24(Palette.overlay)}│${RST}  ` +
    `${dimText('table:')} ${tableName(evt.table)}  ` +
    `${fg24(Palette.overlay)}│${RST}  ` +
    `${timestamp(evt.ts)}`
  );

  // ├───────────────────────────────────────────────────────
  const sepLine = `${borderColor}${Box.hv}${Box.h.repeat(BOX_WIDTH - 1)}${RST}`;

  // │  query body (each line indented)
  const queryLines = indentQuery(evt.query, evt.operation);

  // │  ✔ N rows affected
  const resultLine = bordered(affectedTag(evt.affected, evt.operation));

  // └───────────────────────────────────────────────────────
  const botLine = `${borderColor}${Box.bl}${Box.h.repeat(BOX_WIDTH - 1)}${RST}`;

  return [
    '',
    topLine,
    metaLine,
    sepLine,
    queryLines,
    sepLine,
    resultLine,
    botLine,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════════════

/** Format a query event according to the current verbosity level. */
export function formatQuery(evt: QueryEvent, verbosity: Verbosity): string {
  return verbosity === 'verbose'
    ? formatVerbose(evt)
    : formatNormal(evt);
}

/** Format a server lifecycle message (startup, source switch, etc.). */
export function formatLifecycle(message: string): string {
  const ts = timestamp(new Date());
  const tag = `${fg24(Palette.purple)}${BOLD}[dbms]${RST}`;
  return `${ts} ${tag} ${fg24(Palette.text)}${message}${RST}`;
}

/** Format a startup banner. */
export function formatBanner(source: string, verbose: boolean): string {
  const border = fg24(Palette.overlay);
  const accent = fg24(Palette.purple);
  const w = 56;

  const lines = [
    '',
    `${border}${Box.h.repeat(w)}${RST}`,
    `  ${accent}${BOLD}DBMS Query Logger${RST}  ${dimText('— powered by libcpp patterns')}`,
    `  ${dimText('source:')} ${fg24(Palette.text)}${BOLD}${source}${RST}   ${dimText('mode:')} ${fg24(Palette.text)}${BOLD}${verbose ? 'verbose' : 'normal'}${RST}`,
    `${border}${Box.h.repeat(w)}${RST}`,
    '',
  ];

  return lines.join('\n');
}
