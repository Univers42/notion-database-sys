// ═══════════════════════════════════════════════════════════════════════════════
// Terminal Renderer — AST → ANSI-escaped string
// ═══════════════════════════════════════════════════════════════════════════════
//
// Converts BlockNode[] into an ANSI-formatted string suitable for terminal
// display. Mirrors the approach of the C++ TermWriter library:
//   - Bold (ESC[1m), Italic (ESC[3m), Underline (ESC[4m), Strikethrough (ESC[9m)
//   - 256-color and RGB support via ANSI escape sequences
//   - Table formatting with box-drawing characters
//   - Properly handles width constraints for wrapping
//
// Usage:
//   import { parse } from '../parser';
//   import { renderTerminal } from './terminal';
//
//   const ast = parse('# Hello\n\nSome *text* with **bold**.');
//   console.log(renderTerminal(ast));
// ═══════════════════════════════════════════════════════════════════════════════

import type { BlockNode, InlineNode, TableAlign } from '../ast';

// ─── ANSI escapes ────────────────────────────────────────────────────────────

const ESC = '\x1b';
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const ITALIC = `${ESC}[3m`;
const UNDERLINE = `${ESC}[4m`;
const STRIKETHROUGH = `${ESC}[9m`;
const INVERSE = `${ESC}[7m`;

const FG = (code: number) => `${ESC}[38;5;${code}m`;
const BG = (code: number) => `${ESC}[48;5;${code}m`;

// Named colors (256-color palette)
const C = {
  heading: FG(75),     // blue
  link: FG(39),        // bright blue
  code: FG(214),       // orange
  codeBg: BG(236),     // dark bg
  quote: FG(245),      // gray
  quoteBorder: FG(242),
  listBullet: FG(214), // orange
  taskDone: FG(40),    // green
  taskPending: FG(245),
  calloutInfo: FG(75),
  calloutWarn: FG(214),
  calloutError: FG(196),
  calloutTip: FG(40),
  highlight: BG(226) + FG(0), // yellow bg, black fg
  hr: FG(240),
  tableFrame: FG(240),
  math: FG(141),       // purple
  footnote: FG(245),
};

// ─── Options ─────────────────────────────────────────────────────────────────

export interface TerminalRenderOptions {
  /** Terminal width in columns (default: 80) */
  width?: number;
  /** Indentation per nesting level (default: 2) */
  indent?: number;
  /** Enable colors (default: true) */
  color?: boolean;
}

const defaults: Required<TerminalRenderOptions> = {
  width: 80,
  indent: 2,
  color: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function renderTerminal(
  blocks: BlockNode[],
  opts?: TerminalRenderOptions,
): string {
  const o = { ...defaults, ...opts };
  const ctx: RenderCtx = { o, depth: 0 };
  return blocks.map(b => renderBlock(b, ctx)).join('\n');
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface RenderCtx {
  o: Required<TerminalRenderOptions>;
  depth: number;
}

function ind(ctx: RenderCtx): string {
  return ' '.repeat(ctx.depth * ctx.o.indent);
}

function c(ctx: RenderCtx, code: string): string {
  return ctx.o.color ? code : '';
}

function reset(ctx: RenderCtx): string {
  return ctx.o.color ? RESET : '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

function renderBlock(node: BlockNode, ctx: RenderCtx): string {
  const prefix = ind(ctx);

  switch (node.type) {
    case 'document':
      return node.children.map(ch => renderBlock(ch, ctx)).join('\n');

    case 'paragraph':
      return `${prefix}${renderInlines(node.children, ctx)}\n`;

    case 'heading': {
      const text = renderInlines(node.children, ctx);
      const marker = '#'.repeat(node.level);
      const hl = c(ctx, BOLD + C.heading);
      const rst = reset(ctx);
      if (node.level <= 2) {
        // Underline style for h1/h2
        const underChar = node.level === 1 ? '═' : '─';
        const underline = underChar.repeat(Math.min(stripAnsi(text).length + marker.length + 1, ctx.o.width - prefix.length));
        return `${prefix}${hl}${marker} ${text}${rst}\n${prefix}${c(ctx, C.heading)}${underline}${rst}\n`;
      }
      return `${prefix}${hl}${marker} ${text}${rst}\n`;
    }

    case 'blockquote': {
      const innerCtx: RenderCtx = { ...ctx, depth: ctx.depth + 1 };
      const inner = node.children.map(ch => renderBlock(ch, innerCtx)).join('');
      // Add quote bar to each line
      const bar = `${c(ctx, C.quoteBorder)}│${reset(ctx)}`;
      return inner
        .split('\n')
        .map(line => line ? `${prefix}${bar} ${c(ctx, C.quote)}${line.trimStart()}${reset(ctx)}` : '')
        .join('\n') + '\n';
    }

    case 'code_block': {
      const langLabel = node.lang ? ` ${node.lang} ` : '';
      const top = `${prefix}${c(ctx, C.tableFrame)}┌${langLabel}${'─'.repeat(Math.max(0, ctx.o.width - prefix.length - langLabel.length - 2))}┐${reset(ctx)}`;
      const bottom = `${prefix}${c(ctx, C.tableFrame)}└${'─'.repeat(ctx.o.width - prefix.length - 2)}┘${reset(ctx)}`;

      const lines = node.value.split('\n').map(line =>
        `${prefix}${c(ctx, C.tableFrame)}│${reset(ctx)} ${c(ctx, C.code + C.codeBg)}${line}${reset(ctx)}`
      );

      return `${top}\n${lines.join('\n')}\n${bottom}\n`;
    }

    case 'unordered_list':
      return node.children.map((item, i) => {
        const bullet = `${c(ctx, C.listBullet)}•${reset(ctx)}`;
        const innerCtx: RenderCtx = { ...ctx, depth: ctx.depth + 1 };
        const body = item.children.map(ch => renderBlock(ch, innerCtx)).join('').trimEnd();
        // Replace first line's indent with bullet
        const firstLinePrefix = ind(ctx) + ' ';
        const lines = body.split('\n');
        if (lines[0]) {
          lines[0] = `${prefix}${bullet} ${lines[0].trimStart()}`;
        }
        return lines.join('\n');
      }).join('\n') + '\n';

    case 'ordered_list':
      return node.children.map((item, i) => {
        const num = `${c(ctx, C.listBullet)}${(node.start ?? 1) + i}.${reset(ctx)}`;
        const innerCtx: RenderCtx = { ...ctx, depth: ctx.depth + 1 };
        const body = item.children.map(ch => renderBlock(ch, innerCtx)).join('').trimEnd();
        const lines = body.split('\n');
        if (lines[0]) {
          lines[0] = `${prefix}${num} ${lines[0].trimStart()}`;
        }
        return lines.join('\n');
      }).join('\n') + '\n';

    case 'task_list':
      return node.children.map(item => {
        const check = item.checked
          ? `${c(ctx, C.taskDone)}[✓]${reset(ctx)}`
          : `${c(ctx, C.taskPending)}[ ]${reset(ctx)}`;
        const innerCtx: RenderCtx = { ...ctx, depth: ctx.depth + 1 };
        const body = item.children.map(ch => renderBlock(ch, innerCtx)).join('').trimEnd();
        const lines = body.split('\n');
        if (lines[0]) {
          const textStyle = item.checked ? c(ctx, STRIKETHROUGH + DIM) : '';
          lines[0] = `${prefix}${check} ${textStyle}${lines[0].trimStart()}${reset(ctx)}`;
        }
        return lines.join('\n');
      }).join('\n') + '\n';

    case 'thematic_break': {
      const line = '─'.repeat(ctx.o.width - prefix.length * 2);
      return `${prefix}${c(ctx, C.hr)}${line}${reset(ctx)}\n`;
    }

    case 'table':
      return renderTermTable(node, ctx);

    case 'callout': {
      const kindUpper = node.kind.toUpperCase();
      const kindColor = getCalloutColor(node.kind);
      const icon = getCalloutIcon(node.kind);
      const title = node.title.length ? ' ' + renderInlines(node.title, ctx) : '';
      const header = `${prefix}${c(ctx, kindColor + BOLD)}${icon} ${kindUpper}${title}${reset(ctx)}`;
      const innerCtx: RenderCtx = { ...ctx, depth: ctx.depth + 1 };
      const body = node.children.map(ch => renderBlock(ch, innerCtx)).join('');
      const bar = `${c(ctx, kindColor)}│${reset(ctx)}`;
      const bodyLines = body.split('\n').map(line =>
        line ? `${prefix}${bar} ${line.trimStart()}` : ''
      ).join('\n');
      return `${header}\n${bodyLines}\n`;
    }

    case 'math_block':
      return `${prefix}${c(ctx, C.math)}${node.value}${reset(ctx)}\n`;

    case 'html_block':
      return `${prefix}${c(ctx, DIM)}[HTML block]${reset(ctx)}\n`;

    case 'footnote_def': {
      const label = `${c(ctx, C.footnote)}[${node.label}]${reset(ctx)}`;
      const innerCtx: RenderCtx = { ...ctx, depth: ctx.depth + 1 };
      const body = node.children.map(ch => renderBlock(ch, innerCtx)).join('').trimEnd();
      return `${prefix}${label} ${body.trimStart()}\n`;
    }

    case 'definition_list':
      return node.items.map(item => {
        const term = `${prefix}${c(ctx, BOLD)}${renderInlines(item.term, ctx)}${reset(ctx)}`;
        const defs = item.definitions.map(def =>
          `${prefix}  ${renderInlines(def, ctx)}`
        ).join('\n');
        return `${term}\n${defs}`;
      }).join('\n') + '\n';

    case 'toggle': {
      const summary = renderInlines(node.summary, ctx);
      const innerCtx: RenderCtx = { ...ctx, depth: ctx.depth + 1 };
      const body = node.children.map(ch => renderBlock(ch, innerCtx)).join('');
      return `${prefix}${c(ctx, BOLD)}▸${reset(ctx)} ${summary}\n${body}`;
    }

    default:
      return '';
  }
}

// ─── Terminal table with box drawing ─────────────────────────────────────────

function renderTermTable(
  node: Extract<BlockNode, { type: 'table' }>,
  ctx: RenderCtx,
): string {
  // Calculate column widths
  const allRows = [node.head, ...node.rows];
  const colCount = node.head.cells.length;
  const colWidths = Array(colCount).fill(0);

  for (const row of allRows) {
    for (let i = 0; i < colCount; i++) {
      const cell = row.cells[i];
      if (cell) {
        const text = renderInlinesPlain(cell.children);
        colWidths[i] = Math.max(colWidths[i], text.length);
      }
    }
  }

  // Ensure minimum widths
  for (let i = 0; i < colCount; i++) {
    colWidths[i] = Math.max(colWidths[i], 3);
  }

  const fc = c(ctx, C.tableFrame);
  const rst = reset(ctx);
  const prefix = ind(ctx);

  const hLine = (left: string, mid: string, right: string) => {
    return `${prefix}${fc}${left}${colWidths.map(w => '─'.repeat(w + 2)).join(mid)}${right}${rst}`;
  };

  const formatRow = (cells: typeof node.head.cells, bold: boolean) => {
    return `${prefix}${fc}│${rst}` + cells.map((cell, i) => {
      const text = cell ? renderInlines(cell.children, ctx) : '';
      const plain = cell ? renderInlinesPlain(cell.children) : '';
      const padLen = Math.max(0, (colWidths[i] || 3) - plain.length);
      const align = node.alignments[i];
      let padded: string;
      if (align === 'center') {
        const left = Math.floor(padLen / 2);
        padded = ' '.repeat(left) + text + ' '.repeat(padLen - left);
      } else if (align === 'right') {
        padded = ' '.repeat(padLen) + text;
      } else {
        padded = text + ' '.repeat(padLen);
      }
      const style = bold ? c(ctx, BOLD) : '';
      return ` ${style}${padded}${bold ? rst : ''} ${fc}│${rst}`;
    }).join('');
  };

  const lines = [
    hLine('┌', '┬', '┐'),
    formatRow(node.head.cells, true),
    hLine('├', '┼', '┤'),
    ...node.rows.map(row => formatRow(row.cells, false)),
    hLine('└', '┴', '┘'),
  ];

  return lines.join('\n') + '\n';
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

function renderInlines(nodes: InlineNode[], ctx: RenderCtx): string {
  return nodes.map(n => renderInline(n, ctx)).join('');
}

function renderInline(node: InlineNode, ctx: RenderCtx): string {
  switch (node.type) {
    case 'text':
      return node.value;
    case 'bold':
      return `${c(ctx, BOLD)}${renderInlines(node.children, ctx)}${reset(ctx)}`;
    case 'italic':
      return `${c(ctx, ITALIC)}${renderInlines(node.children, ctx)}${reset(ctx)}`;
    case 'bold_italic':
      return `${c(ctx, BOLD + ITALIC)}${renderInlines(node.children, ctx)}${reset(ctx)}`;
    case 'strikethrough':
      return `${c(ctx, STRIKETHROUGH)}${renderInlines(node.children, ctx)}${reset(ctx)}`;
    case 'underline':
      return `${c(ctx, UNDERLINE)}${renderInlines(node.children, ctx)}${reset(ctx)}`;
    case 'code':
      return `${c(ctx, C.code + C.codeBg)} ${node.value} ${reset(ctx)}`;
    case 'link':
      return `${c(ctx, C.link + UNDERLINE)}${renderInlines(node.children, ctx)}${reset(ctx)}${c(ctx, DIM)} (${node.href})${reset(ctx)}`;
    case 'image':
      return `${c(ctx, DIM)}[image: ${node.alt}]${reset(ctx)}`;
    case 'line_break':
      return '\n' + ind(ctx);
    case 'highlight':
      return `${c(ctx, C.highlight)}${renderInlines(node.children, ctx)}${reset(ctx)}`;
    case 'math_inline':
      return `${c(ctx, C.math)}${node.value}${reset(ctx)}`;
    case 'footnote_ref':
      return `${c(ctx, C.footnote)}[${node.label}]${reset(ctx)}`;
    case 'emoji':
      return node.value;
    default:
      return '';
  }
}

/** Render inlines as plain text (no ANSI — for width calculations) */
function renderInlinesPlain(nodes: InlineNode[]): string {
  return nodes.map(n => {
    switch (n.type) {
      case 'text': return n.value;
      case 'bold': case 'italic': case 'bold_italic': case 'strikethrough':
      case 'underline': case 'highlight':
        return renderInlinesPlain(n.children);
      case 'code': return n.value;
      case 'link': return renderInlinesPlain(n.children);
      case 'image': return n.alt;
      case 'line_break': return ' ';
      case 'math_inline': return n.value;
      case 'footnote_ref': return `[${n.label}]`;
      case 'emoji': return n.value;
      default: return '';
    }
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function getCalloutColor(kind: string): string {
  switch (kind) {
    case 'warning': case 'caution': return C.calloutWarn;
    case 'danger': case 'error': return C.calloutError;
    case 'tip': case 'success': return C.calloutTip;
    default: return C.calloutInfo;
  }
}

function getCalloutIcon(kind: string): string {
  switch (kind) {
    case 'warning': case 'caution': return '⚠';
    case 'danger': case 'error': return '✖';
    case 'tip': case 'success': return '✔';
    case 'note': return 'ℹ';
    case 'info': return 'ℹ';
    default: return '▪';
  }
}
