// Markdown parser — parse context, simple block parsers, and helpers
import type {
  BlockNode, InlineNode, ListItemNode, TableRowNode, TableCellNode, TableAlign,
} from './ast';
import { parseInline } from './parserInline';
export interface ParseContext {
  lines: string[];
  pos: number;
}

export function peek(ctx: ParseContext): string | null {
  return ctx.pos < ctx.lines.length ? ctx.lines[ctx.pos] : null;
}

export function advance(ctx: ParseContext): string {
  return ctx.lines[ctx.pos++];
}

export function isThematicBreak(line: string): boolean {
  const stripped = line.replace(/\s/g, '');
  if (stripped.length < 3) return false;
  return /^-{3,}$/.test(stripped) || /^\*{3,}$/.test(stripped) || /^_{3,}$/.test(stripped);
}

export function isSetextHeading(ctx: ParseContext): boolean {
  if (ctx.pos + 1 >= ctx.lines.length) return false;
  const nextLine = ctx.lines[ctx.pos + 1].trim();
  const currentLine = ctx.lines[ctx.pos].trim();
  if (!currentLine || currentLine.startsWith('>') || /^[-*+]\s/.test(currentLine)) return false;
  return /^={3,}\s*$/.test(nextLine) || /^-{3,}\s*$/.test(nextLine);
}

export function parseFencedCode(ctx: ParseContext): BlockNode {
  const openLine = advance(ctx).trimStart();
  const fence = openLine.startsWith('```') ? '```' : '~~~';
  const info = openLine.slice(fence.length).trim();
  const lang = info.split(/\s/)[0] || '';
  const meta = info.slice(lang.length).trim() || undefined;
  const lines: string[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    if (line.trimStart().startsWith(fence) && line.trimStart().slice(fence.length).trim() === '') {
      advance(ctx);
      break;
    }
    lines.push(advance(ctx));
  }

  return { type: 'code_block', lang, meta, value: lines.join('\n') };
}

export function parseMathBlock(ctx: ParseContext): BlockNode {
  advance(ctx); // skip opening $$
  const lines: string[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos].trim();
    if (line === '$$') {
      advance(ctx);
      break;
    }
    lines.push(advance(ctx));
  }
  return { type: 'math_block', value: lines.join('\n') };
}

export const HTML_BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'base', 'basefont', 'blockquote', 'body',
  'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header',
  'hr', 'html', 'iframe', 'legend', 'li', 'link', 'main', 'menu', 'menuitem',
  'nav', 'noframes', 'ol', 'optgroup', 'option', 'p', 'param', 'pre',
  'section', 'source', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'title', 'tr', 'track', 'ul',
]);
export function isHtmlBlockTag(line: string): boolean {
  const match = line.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/);
  return match ? HTML_BLOCK_TAGS.has(match[1].toLowerCase()) : false;
}

export function parseHtmlBlock(ctx: ParseContext): BlockNode {
  const lines: string[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    lines.push(advance(ctx));
    if (line.trim() === '' && lines.length > 1) break;
  }
  return { type: 'html_block', value: lines.join('\n').trimEnd() };
}

export const listStartPattern = /^(?:[-*+]|\d{1,9}[.)])\s/;
export function parseIndentedCode(ctx: ParseContext): BlockNode {
  const lines: string[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    if (line.length >= 4 && line.startsWith('    ')) {
      lines.push(line.slice(4));
      advance(ctx);
    } else if (line.trim() === '') {
      lines.push('');
      advance(ctx);
    } else {
      break;
    }
  }

  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return { type: 'code_block', lang: '', value: lines.join('\n') };
}

export function isTableStart(ctx: ParseContext): boolean {
  if (ctx.pos + 1 >= ctx.lines.length) return false;
  const line1 = ctx.lines[ctx.pos].trim();
  const line2 = ctx.lines[ctx.pos + 1].trim();
  if (!line1.includes('|')) return false;
  return /^\|?[\s:]*-{3,}[\s:]*(\|[\s:]*-{3,}[\s:]*)*\|?\s*$/.test(line2);
}

function parseTableRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|')) row = row.slice(0, -1);
  return row.split('|').map(c => c.trim());
}

function parseAlignments(line: string): TableAlign[] {
  return parseTableRow(line).map(cell => {
    const trimmed = cell.trim().replace(/\s/g, '');
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
    if (trimmed.endsWith(':')) return 'right';
    if (trimmed.startsWith(':')) return 'left';
    return null;
  });
}

export function parseTable(ctx: ParseContext): BlockNode {
  const headerLine = advance(ctx);
  const sepLine = advance(ctx);
  const alignments = parseAlignments(sepLine);
  const headCells: TableCellNode[] = parseTableRow(headerLine).map(cell => ({
    type: 'table_cell',
    children: parseInline(cell),
  }));
  const head: TableRowNode = { type: 'table_row', cells: headCells };
  const rows: TableRowNode[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos].trim();
    if (!line || !line.includes('|')) break;
    const cells = parseTableRow(line).map(cell => ({
      type: 'table_cell' as const,
      children: parseInline(cell),
    }));
    rows.push({ type: 'table_row', cells });
    advance(ctx);
  }

  return { type: 'table', head, rows, alignments };
}

export function parseParagraph(ctx: ParseContext): BlockNode {
  const lines: string[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    const trimmed = line.trim();
    if (trimmed === '') break;
    if (isThematicBreak(trimmed)) break;
    if (/^#{1,6}\s/.test(trimmed)) break;
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) break;
    if (trimmed.startsWith('$$')) break;
    if (/^>\s/.test(trimmed) || trimmed === '>') break;
    if (/^[-*+]\s+/.test(trimmed)) break;
    if (/^\d{1,9}[.)]\s+/.test(trimmed)) break;
    if (/^\[\^([^\]]+)\]:\s/.test(trimmed)) break;
    if (isTableStart(ctx)) break;
    if (/^<([a-zA-Z])/.test(trimmed) && isHtmlBlockTag(trimmed)) break;
    if (ctx.pos + 1 < ctx.lines.length) {
      const nextLine = ctx.lines[ctx.pos + 1].trim();
      if (/^={3,}\s*$/.test(nextLine) || /^-{3,}\s*$/.test(nextLine)) {
        if (lines.length === 0) break;
        break;
      }
    }

    lines.push(trimmed);
    advance(ctx);
  }

  const text = lines.join('\n');
  return { type: 'paragraph', children: parseInline(text) };
}
// INLINE PARSER
//
// Scans text left-to-right, matching patterns for inline formatting.
// Uses a priority-ordered set of matchers.
