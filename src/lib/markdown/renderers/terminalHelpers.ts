
import type { BlockNode, InlineNode, TableAlign } from '../ast';
export const ESC = '\x1b';
export const RESET = `${ESC}[0m`;
export const BOLD = `${ESC}[1m`;
export const DIM = `${ESC}[2m`;
export const ITALIC = `${ESC}[3m`;
export const UNDERLINE = `${ESC}[4m`;
export const STRIKETHROUGH = `${ESC}[9m`;
export const INVERSE = `${ESC}[7m`;
export const FG = (code: number) => `${ESC}[38;5;${code}m`;
export const BG = (code: number) => `${ESC}[48;5;${code}m`;
export const C = {
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
export interface TerminalRenderOptions {
  /** Terminal width in columns (default: 80) */
  width?: number;
  /** Indentation per nesting level (default: 2) */
  indent?: number;
  /** Enable colors (default: true) */
  color?: boolean;
}

export const defaults: Required<TerminalRenderOptions> = {
  width: 80,
  indent: 2,
  color: true,
};
export interface RenderCtx {
  o: Required<TerminalRenderOptions>;
  depth: number;
}

export function ind(ctx: RenderCtx): string {
  return ' '.repeat(ctx.depth * ctx.o.indent);
}

export function c(ctx: RenderCtx, code: string): string {
  return ctx.o.color ? code : '';
}

export function reset(ctx: RenderCtx): string {
  return ctx.o.color ? RESET : '';
}

export function renderTermTable(
  node: Extract<BlockNode, { type: 'table' }>,
  ctx: RenderCtx,
): string {
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

export function renderInlines(nodes: InlineNode[], ctx: RenderCtx): string {
  return nodes.map(n => renderInline(n, ctx)).join('');
}

export function renderInline(node: InlineNode, ctx: RenderCtx): string {
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
export function renderInlinesPlain(nodes: InlineNode[]): string {
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

export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function getCalloutColor(kind: string): string {
  switch (kind) {
    case 'warning': case 'caution': return C.calloutWarn;
    case 'danger': case 'error': return C.calloutError;
    case 'tip': case 'success': return C.calloutTip;
    default: return C.calloutInfo;
  }
}
export function getCalloutIcon(kind: string): string {
  switch (kind) {
    case 'warning': case 'caution': return '⚠';
    case 'danger': case 'error': return '✖';
    case 'tip': case 'success': return '✔';
    case 'note': return 'ℹ';
    case 'info': return 'ℹ';
    default: return '▪';
  }
}
