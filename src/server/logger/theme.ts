// ─── ANSI Theme — port of libcpp/term/color.hpp + stylesheet.hpp ─────────────
// Defines color constants, operation-specific palettes, and box-drawing chars
// inspired by the libcpp StyleSheet/TermStyle system.

// ─── ANSI escape helpers ─────────────────────────────────────────────────────

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

/** Apply 24-bit foreground color. */
function fg(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${ESC}38;2;${r};${g};${b}m`;
}

/** Apply 24-bit background color. */
function bg(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${ESC}48;2;${r};${g};${b}m`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// ─── Font flags — mirrors libcpp::FontFlag ───────────────────────────────────

const BOLD      = `${ESC}1m`;
const DIM       = `${ESC}2m`;
const ITALIC    = `${ESC}3m`;
const UNDERLINE = `${ESC}4m`;

// ─── Palette — inspired by libcpp::Palette + dracula() theme ─────────────────

export const Palette = {
  // Base tones
  bg:        '#1E1F29',
  surface:   '#282A36',
  overlay:   '#44475A',
  muted:     '#6272A4',
  text:      '#F8F8F2',
  subtle:    '#BFBFBF',

  // Accents
  red:       '#FF5555',
  orange:    '#FFB86C',
  yellow:    '#F1FA8C',
  green:     '#50FA7B',
  cyan:      '#8BE9FD',
  blue:      '#6272FF',
  purple:    '#BD93F9',
  pink:      '#FF79C6',

  // Semantic
  insert:    '#50FA7B',
  update:    '#8BE9FD',
  delete:    '#FF5555',
  alter:     '#BD93F9',
  select:    '#F1FA8C',
  meta:      '#FFB86C',
} as const;

// ─── Operation styles (like StyleSheet rules) ────────────────────────────────

export interface OpStyle {
  badge:   string;   // colored operation badge
  icon:    string;   // glyph prefix
  accent:  string;   // color for query body highlights
  dim:     string;   // color for secondary info
}

const OP_STYLES: Record<string, OpStyle> = {
  INSERT:        { badge: bg('#0B3D1E') + fg(Palette.insert),  icon: '＋', accent: fg(Palette.insert), dim: fg(Palette.muted) },
  DELETE:        { badge: bg('#3D0B0B') + fg(Palette.delete),  icon: '✕ ', accent: fg(Palette.delete), dim: fg(Palette.muted) },
  UPDATE:        { badge: bg('#0B2D3D') + fg(Palette.update),  icon: '▸ ', accent: fg(Palette.update), dim: fg(Palette.muted) },
  ADD_COLUMN:    { badge: bg('#1E0B3D') + fg(Palette.alter),   icon: '＋', accent: fg(Palette.alter),  dim: fg(Palette.muted) },
  DROP_COLUMN:   { badge: bg('#3D0B1E') + fg(Palette.delete),  icon: '✕ ', accent: fg(Palette.delete), dim: fg(Palette.muted) },
  ALTER_TYPE:    { badge: bg('#1E0B3D') + fg(Palette.alter),   icon: '⇄ ', accent: fg(Palette.alter),  dim: fg(Palette.muted) },
  SELECT:        { badge: bg('#2D2D0B') + fg(Palette.select),  icon: '◆ ', accent: fg(Palette.select), dim: fg(Palette.muted) },
  SOURCE_SWITCH: { badge: bg('#2D1E0B') + fg(Palette.meta),    icon: '⟳ ', accent: fg(Palette.meta),   dim: fg(Palette.muted) },
  STATE_LOAD:    { badge: bg('#2D1E0B') + fg(Palette.meta),    icon: '◈ ', accent: fg(Palette.meta),   dim: fg(Palette.muted) },
};

export function getOpStyle(op: string): OpStyle {
  return OP_STYLES[op] ?? OP_STYLES.SELECT;
}

// ─── Rendering helpers ───────────────────────────────────────────────────────

/** Wrap text in a colored badge: ` OP ` */
export function badge(op: string): string {
  const st = getOpStyle(op);
  return `${st.badge}${BOLD} ${op.padEnd(11)} ${RESET}`;
}

/** Source label: [json], [csv], etc. */
export function sourceTag(source: string): string {
  return `${fg(Palette.muted)}${DIM}[${source}]${RESET}`;
}

/** Table name, highlighted. */
export function tableName(table: string): string {
  return `${fg(Palette.text)}${BOLD}${table}${RESET}`;
}

/** Dimmed secondary text. */
export function dimText(text: string): string {
  return `${fg(Palette.muted)}${DIM}${text}${RESET}`;
}

/** Accent-colored text. */
export function accentText(op: string, text: string): string {
  const st = getOpStyle(op);
  return `${st.accent}${text}${RESET}`;
}

/** Affected rows indicator. */
export function affectedTag(n: number, op: string): string {
  const st = getOpStyle(op);
  const icon = n > 0 ? '✔' : '○';
  return `${st.accent}${icon} ${n} row${n !== 1 ? 's' : ''}${RESET}`;
}

/** Timestamp in HH:MM:SS.mmm format. */
export function timestamp(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${fg(Palette.muted)}${DIM}${hh}:${mm}:${ss}.${ms}${RESET}`;
}

// ─── Box drawing — port of libcpp::Glyph ─────────────────────────────────────

export const Box = {
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  h: '─', v: '│', hv: '├', vh: '┤',
  hl: '╌',
} as const;

/** Draw a horizontal rule of given width. */
export function hr(width: number, char = Box.h): string {
  return `${fg(Palette.overlay)}${char.repeat(width)}${RESET}`;
}

/** Draw a left border with content. */
export function bordered(content: string): string {
  return `${fg(Palette.overlay)}${Box.v}${RESET} ${content}`;
}

/** Indent multi-line query text for box display. */
export function indentQuery(query: string, op: string): string {
  const st = getOpStyle(op);
  return query.split('\n').map(line => {
    // Color comment lines differently
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('--')) {
      return bordered(`${fg(Palette.muted)}${ITALIC}${line}${RESET}`);
    }
    return bordered(`${st.accent}${line}${RESET}`);
  }).join('\n');
}
