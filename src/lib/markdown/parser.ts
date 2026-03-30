// ═══════════════════════════════════════════════════════════════════════════════
// Markdown Parser — full CommonMark + GFM parser, zero dependencies
// ═══════════════════════════════════════════════════════════════════════════════
//
// Converts a raw markdown string → BlockNode[] AST.
//
// Supported blocks:
//   headings (ATX + setext), paragraphs, blockquotes, code blocks (fenced +
//   indented), ordered/unordered/task lists, thematic breaks, tables (GFM),
//   callouts (!type), math blocks ($$), HTML blocks, footnotes, toggles.
//
// Supported inline:
//   bold, italic, bold-italic, strikethrough, underline, inline code, links,
//   images, line breaks, highlights (==), inline math ($), emoji (:name:),
//   footnote references [^label].
//
// Architecture:
//   1. Block-level pass: splits input into block tokens (line-by-line state)
//   2. Inline pass: parses inline content within each block's text spans
//
// This module is framework-agnostic. It produces AST nodes (see ast.ts).
// Renderers consume the AST — see renderers/html.ts, renderers/react.tsx, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  BlockNode, InlineNode, ListItemNode, TaskItemNode,
  TableRowNode, TableCellNode, TableAlign,
} from './ast';

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a markdown string into AST block nodes.
 */
export function parse(markdown: string): BlockNode[] {
  const lines = markdown.split('\n');
  const ctx: ParseContext = { lines, pos: 0 };
  return parseBlocks(ctx, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK PARSER
// ═══════════════════════════════════════════════════════════════════════════════

interface ParseContext {
  lines: string[];
  pos: number;
}

function peek(ctx: ParseContext): string | null {
  return ctx.pos < ctx.lines.length ? ctx.lines[ctx.pos] : null;
}

function advance(ctx: ParseContext): string {
  return ctx.lines[ctx.pos++];
}

function parseBlocks(ctx: ParseContext, indent: number): BlockNode[] {
  const blocks: BlockNode[] = [];

  while (ctx.pos < ctx.lines.length) {
    const line = peek(ctx)!;
    const trimmed = line.trimStart();
    const lineIndent = line.length - line.trimStart().length;

    // Blank line — skip
    if (trimmed === '') {
      advance(ctx);
      continue;
    }

    // Thematic break: --- or *** or ___ (3+ chars, optionally with spaces)
    if (isThematicBreak(trimmed)) {
      advance(ctx);
      blocks.push({ type: 'thematic_break' });
      continue;
    }

    // ATX heading: # ... ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
    if (headingMatch) {
      advance(ctx);
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = headingMatch[2];
      const id = slugify(text);
      blocks.push({ type: 'heading', level, children: parseInline(text), id });
      continue;
    }

    // Fenced code block: ``` or ~~~
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      blocks.push(parseFencedCode(ctx));
      continue;
    }

    // Math block: $$
    if (trimmed.startsWith('$$')) {
      blocks.push(parseMathBlock(ctx));
      continue;
    }

    // HTML block: starts with <tag
    if (/^<([a-zA-Z][a-zA-Z0-9-]*)[\s>\/]/.test(trimmed) && isHtmlBlockTag(trimmed)) {
      blocks.push(parseHtmlBlock(ctx));
      continue;
    }

    // Table: line with | pipes and next line is separator
    if (isTableStart(ctx)) {
      blocks.push(parseTable(ctx));
      continue;
    }

    // Callout: > [!type] ... (GFM-style, before regular blockquote)
    if (/^>\s*\[!(\w+)\]/.test(trimmed)) {
      blocks.push(parseCallout(ctx));
      continue;
    }

    // Blockquote: > ...
    if (trimmed.startsWith('> ') || trimmed === '>') {
      blocks.push(parseBlockquote(ctx));
      continue;
    }

    // Task list: - [x] or - [ ]
    if (/^[-*+]\s+\[([ xX])\]\s/.test(trimmed)) {
      blocks.push(parseTaskList(ctx));
      continue;
    }

    // Unordered list: - item, * item, + item
    if (/^[-*+]\s+/.test(trimmed) && !isThematicBreak(trimmed)) {
      blocks.push(parseUnorderedList(ctx));
      continue;
    }

    // Ordered list: 1. item, 1) item
    if (/^\d{1,9}[.)]\s+/.test(trimmed)) {
      blocks.push(parseOrderedList(ctx));
      continue;
    }

    // Footnote definition: [^label]: ...
    if (/^\[\^([^\]]+)\]:\s/.test(trimmed)) {
      blocks.push(parseFootnoteDef(ctx));
      continue;
    }

    // Indented code block: 4+ spaces (only if not inside a list context)
    if (lineIndent >= 4 && indent === 0) {
      blocks.push(parseIndentedCode(ctx));
      continue;
    }

    // Setext heading: check if next line is === or ---
    if (isSetextHeading(ctx)) {
      const textLine = advance(ctx);
      const markerLine = advance(ctx);
      const level = markerLine.trim().startsWith('=') ? 1 : 2;
      const id = slugify(textLine.trim());
      blocks.push({ type: 'heading', level: level as 1 | 2, children: parseInline(textLine.trim()), id });
      continue;
    }

    // Default: paragraph (collect continuation lines)
    blocks.push(parseParagraph(ctx));
  }

  return blocks;
}

// ─── Thematic break ───────────────────────────────────────────────────────────

function isThematicBreak(line: string): boolean {
  const stripped = line.replace(/\s/g, '');
  if (stripped.length < 3) return false;
  return /^-{3,}$/.test(stripped) || /^\*{3,}$/.test(stripped) || /^_{3,}$/.test(stripped);
}

// ─── Setext heading ───────────────────────────────────────────────────────────

function isSetextHeading(ctx: ParseContext): boolean {
  if (ctx.pos + 1 >= ctx.lines.length) return false;
  const nextLine = ctx.lines[ctx.pos + 1].trim();
  const currentLine = ctx.lines[ctx.pos].trim();
  if (!currentLine || currentLine.startsWith('>') || /^[-*+]\s/.test(currentLine)) return false;
  return /^={3,}\s*$/.test(nextLine) || /^-{3,}\s*$/.test(nextLine);
}

// ─── Fenced code block ───────────────────────────────────────────────────────

function parseFencedCode(ctx: ParseContext): BlockNode {
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

// ─── Math block ($$ ... $$) ──────────────────────────────────────────────────

function parseMathBlock(ctx: ParseContext): BlockNode {
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

// ─── HTML block ──────────────────────────────────────────────────────────────

const HTML_BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'base', 'basefont', 'blockquote', 'body',
  'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header',
  'hr', 'html', 'iframe', 'legend', 'li', 'link', 'main', 'menu', 'menuitem',
  'nav', 'noframes', 'ol', 'optgroup', 'option', 'p', 'param', 'pre',
  'section', 'source', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'title', 'tr', 'track', 'ul',
]);

function isHtmlBlockTag(line: string): boolean {
  const match = line.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/);
  return match ? HTML_BLOCK_TAGS.has(match[1].toLowerCase()) : false;
}

function parseHtmlBlock(ctx: ParseContext): BlockNode {
  const lines: string[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    lines.push(advance(ctx));
    if (line.trim() === '' && lines.length > 1) break;
  }
  return { type: 'html_block', value: lines.join('\n').trimEnd() };
}

// ─── Blockquote ──────────────────────────────────────────────────────────────

function parseBlockquote(ctx: ParseContext): BlockNode {
  const innerLines: string[] = [];

  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    const trimmed = line.trimStart();

    if (trimmed.startsWith('> ')) {
      innerLines.push(trimmed.slice(2));
      advance(ctx);
    } else if (trimmed === '>') {
      innerLines.push('');
      advance(ctx);
    } else if (trimmed === '' || !trimmed.startsWith('>')) {
      break;
    } else {
      break;
    }
  }

  const innerCtx: ParseContext = { lines: innerLines, pos: 0 };
  return { type: 'blockquote', children: parseBlocks(innerCtx, 0) };
}

// ─── Callout: > [!type] ──────────────────────────────────────────────────────

function parseCallout(ctx: ParseContext): BlockNode {
  const firstLine = advance(ctx).trimStart();
  const calloutMatch = firstLine.match(/^>\s*\[!(\w+)\]\s*(.*)/);
  const kind = calloutMatch?.[1] || 'note';
  const titleText = calloutMatch?.[2] || '';

  const innerLines: string[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos].trimStart();
    if (line.startsWith('> ')) {
      innerLines.push(line.slice(2));
      advance(ctx);
    } else if (line === '>') {
      innerLines.push('');
      advance(ctx);
    } else {
      break;
    }
  }

  const innerCtx: ParseContext = { lines: innerLines, pos: 0 };
  return {
    type: 'callout',
    kind: kind.toLowerCase(),
    title: parseInline(titleText),
    children: parseBlocks(innerCtx, 0),
  };
}

// ─── Task list ───────────────────────────────────────────────────────────────

function parseTaskList(ctx: ParseContext): BlockNode {
  const items: TaskItemNode[] = [];

  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos].trimStart();
    const match = line.match(/^[-*+]\s+\[([ xX])\]\s+(.*)/);
    if (!match) break;

    advance(ctx);
    const checked = match[1] !== ' ';
    const content = match[2];

    // Collect continuation lines
    const contLines = [content];
    while (ctx.pos < ctx.lines.length) {
      const next = ctx.lines[ctx.pos];
      const nextTrimmed = next.trimStart();
      const nextIndent = next.length - nextTrimmed.length;
      if (nextTrimmed === '' || nextIndent >= 2 && !listStartPattern.test(nextTrimmed)) {
        contLines.push(nextTrimmed);
        advance(ctx);
      } else {
        break;
      }
    }

    const innerCtx: ParseContext = { lines: contLines, pos: 0 };
    items.push({ type: 'task_item', checked, children: parseBlocks(innerCtx, 1) });
  }

  return { type: 'task_list', children: items };
}

const listStartPattern = /^(?:[-*+]|\d{1,9}[.)])\s/;

// ─── Unordered list ──────────────────────────────────────────────────────────

function parseUnorderedList(ctx: ParseContext): BlockNode {
  const items: ListItemNode[] = [];

  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos].trimStart();
    if (!/^[-*+]\s+/.test(line)) break;

    advance(ctx);
    const content = line.replace(/^[-*+]\s+/, '');
    const contLines = [content];

    // Continuation lines: indented or blank within list
    while (ctx.pos < ctx.lines.length) {
      const next = ctx.lines[ctx.pos];
      const nextTrimmed = next.trimStart();
      const nextIndent = next.length - nextTrimmed.length;

      if (nextTrimmed === '') {
        // Blank line — only include if next non-blank is still indented list content
        if (ctx.pos + 1 < ctx.lines.length) {
          const afterBlank = ctx.lines[ctx.pos + 1];
          const afterTrimmed = afterBlank.trimStart();
          const afterIndent = afterBlank.length - afterTrimmed.length;
          if (afterIndent >= 2 && !listStartPattern.test(afterTrimmed)) {
            contLines.push('');
            advance(ctx);
            continue;
          }
        }
        break;
      } else if (nextIndent >= 2 && !(/^[-*+]\s/.test(nextTrimmed) && nextIndent < 4)) {
        contLines.push(nextTrimmed);
        advance(ctx);
      } else {
        break;
      }
    }

    const innerCtx: ParseContext = { lines: contLines, pos: 0 };
    items.push({ type: 'list_item', children: parseBlocks(innerCtx, 1) });
  }

  return { type: 'unordered_list', children: items };
}

// ─── Ordered list ────────────────────────────────────────────────────────────

function parseOrderedList(ctx: ParseContext): BlockNode {
  const items: ListItemNode[] = [];
  let start = 1;
  let first = true;

  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos].trimStart();
    const match = line.match(/^(\d{1,9})([.)]\s+)(.*)/);
    if (!match) break;

    advance(ctx);
    if (first) { start = parseInt(match[1], 10); first = false; }
    const markerLen = match[1].length + match[2].length;
    const content = match[3];
    const contLines = [content];

    while (ctx.pos < ctx.lines.length) {
      const next = ctx.lines[ctx.pos];
      const nextTrimmed = next.trimStart();
      const nextIndent = next.length - nextTrimmed.length;

      if (nextTrimmed === '') {
        if (ctx.pos + 1 < ctx.lines.length) {
          const afterBlank = ctx.lines[ctx.pos + 1];
          const afterTrimmed = afterBlank.trimStart();
          const afterIndent = afterBlank.length - afterTrimmed.length;
          if (afterIndent >= 2) {
            contLines.push('');
            advance(ctx);
            continue;
          }
        }
        break;
      } else if (nextIndent >= markerLen && !/^\d{1,9}[.)]\s/.test(nextTrimmed)) {
        contLines.push(nextTrimmed);
        advance(ctx);
      } else {
        break;
      }
    }

    const innerCtx: ParseContext = { lines: contLines, pos: 0 };
    items.push({ type: 'list_item', children: parseBlocks(innerCtx, 1) });
  }

  return { type: 'ordered_list', start, children: items };
}

// ─── Indented code block ─────────────────────────────────────────────────────

function parseIndentedCode(ctx: ParseContext): BlockNode {
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

  // Trim trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  return { type: 'code_block', lang: '', value: lines.join('\n') };
}

// ─── Table (GFM) ────────────────────────────────────────────────────────────

function isTableStart(ctx: ParseContext): boolean {
  if (ctx.pos + 1 >= ctx.lines.length) return false;
  const line1 = ctx.lines[ctx.pos].trim();
  const line2 = ctx.lines[ctx.pos + 1].trim();
  if (!line1.includes('|')) return false;
  // Separator line: must have | and dashes, optionally :
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

function parseTable(ctx: ParseContext): BlockNode {
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

// ─── Footnote definition ─────────────────────────────────────────────────────

function parseFootnoteDef(ctx: ParseContext): BlockNode {
  const line = advance(ctx);
  const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)/);
  const label = match?.[1] || '';
  const firstContent = match?.[2] || '';

  const contLines = [firstContent];
  while (ctx.pos < ctx.lines.length) {
    const next = ctx.lines[ctx.pos];
    const indent = next.length - next.trimStart().length;
    if (next.trim() === '' || indent >= 2) {
      contLines.push(next.trimStart());
      advance(ctx);
    } else {
      break;
    }
  }

  const innerCtx: ParseContext = { lines: contLines, pos: 0 };
  return { type: 'footnote_def', label, children: parseBlocks(innerCtx, 1) };
}

// ─── Paragraph ───────────────────────────────────────────────────────────────

function parseParagraph(ctx: ParseContext): BlockNode {
  const lines: string[] = [];

  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    const trimmed = line.trim();

    // Stop at blank, thematic break, heading, fence, list, blockquote, etc.
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

    // Check if NEXT line is setext heading marker
    if (ctx.pos + 1 < ctx.lines.length) {
      const nextLine = ctx.lines[ctx.pos + 1].trim();
      if (/^={3,}\s*$/.test(nextLine) || /^-{3,}\s*$/.test(nextLine)) {
        // This line is the heading text — don't consume it in paragraph
        if (lines.length === 0) break;
        // If we already have paragraph lines, stop before this one
        break;
      }
    }

    lines.push(trimmed);
    advance(ctx);
  }

  const text = lines.join('\n');
  return { type: 'paragraph', children: parseInline(text) };
}


// ═══════════════════════════════════════════════════════════════════════════════
// INLINE PARSER
// ═══════════════════════════════════════════════════════════════════════════════
//
// Scans text left-to-right, matching patterns for inline formatting.
// Uses a priority-ordered set of matchers.
// ═══════════════════════════════════════════════════════════════════════════════

export function parseInline(text: string): InlineNode[] {
  if (!text) return [];
  const nodes: InlineNode[] = [];
  let pos = 0;

  while (pos < text.length) {
    let matched = false;

    for (const matcher of INLINE_MATCHERS) {
      const result = matcher(text, pos);
      if (result) {
        // Flush preceding plain text
        if (result.start > pos) {
          nodes.push({ type: 'text', value: text.slice(pos, result.start) });
        }
        nodes.push(result.node);
        pos = result.end;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Handle line breaks: two trailing spaces + newline, or backslash newline
      if (text[pos] === '\n') {
        // Check for hard break: two spaces before \n
        const lastNode = nodes[nodes.length - 1];
        if (lastNode?.type === 'text' && lastNode.value.endsWith('  ')) {
          lastNode.value = lastNode.value.slice(0, -2);
          nodes.push({ type: 'line_break' });
        } else if (pos > 0 && text[pos - 1] === '\\') {
          // Backslash line break
          if (lastNode?.type === 'text') {
            lastNode.value = lastNode.value.slice(0, -1);
          }
          nodes.push({ type: 'line_break' });
        } else {
          // Soft break → space
          nodes.push({ type: 'text', value: ' ' });
        }
        pos++;
        continue;
      }

      // Accumulate plain text character
      const lastNode = nodes[nodes.length - 1];
      if (lastNode?.type === 'text') {
        lastNode.value += text[pos];
      } else {
        nodes.push({ type: 'text', value: text[pos] });
      }
      pos++;
    }
  }

  return nodes;
}

// ─── Inline matcher type ─────────────────────────────────────────────────────

interface InlineMatchResult {
  start: number;
  end: number;
  node: InlineNode;
}

type InlineMatcher = (text: string, pos: number) => InlineMatchResult | null;

// ─── Matchers (ordered by priority) ──────────────────────────────────────────

const INLINE_MATCHERS: InlineMatcher[] = [
  // Escaped character
  (text, pos) => {
    if (text[pos] !== '\\' || pos + 1 >= text.length) return null;
    const next = text[pos + 1];
    if ('\\`*_{}[]()#+-.!|~$='.includes(next)) {
      return { start: pos, end: pos + 2, node: { type: 'text', value: next } };
    }
    return null;
  },

  // Inline code: `code` or ``code``
  (text, pos) => {
    if (text[pos] !== '`') return null;
    let ticks = 0;
    let i = pos;
    while (i < text.length && text[i] === '`') { ticks++; i++; }
    const closePattern = '`'.repeat(ticks);
    const closeIdx = text.indexOf(closePattern, i);
    if (closeIdx === -1) return null;
    // Verify exact number of closing ticks
    if (closeIdx + ticks < text.length && text[closeIdx + ticks] === '`') return null;
    const value = text.slice(i, closeIdx).replace(/\n/g, ' ').replace(/^ (.+) $/, '$1');
    return { start: pos, end: closeIdx + ticks, node: { type: 'code', value } };
  },

  // Inline math: $...$
  (text, pos) => {
    if (text[pos] !== '$' || text[pos + 1] === '$') return null;
    const close = text.indexOf('$', pos + 1);
    if (close === -1 || close === pos + 1) return null;
    return { start: pos, end: close + 1, node: { type: 'math_inline', value: text.slice(pos + 1, close) } };
  },

  // Image: ![alt](src "title")
  (text, pos) => {
    if (text[pos] !== '!' || text[pos + 1] !== '[') return null;
    const altClose = findClosingBracket(text, pos + 1);
    if (altClose === -1 || text[altClose + 1] !== '(') return null;
    const parenClose = text.indexOf(')', altClose + 2);
    if (parenClose === -1) return null;
    const alt = text.slice(pos + 2, altClose);
    const inside = text.slice(altClose + 2, parenClose).trim();
    const titleMatch = inside.match(/^(.*?)\s+"([^"]*)"$/);
    const src = titleMatch ? titleMatch[1] : inside;
    const title = titleMatch ? titleMatch[2] : undefined;
    return { start: pos, end: parenClose + 1, node: { type: 'image', src, alt, title } };
  },

  // Link: [text](href "title")
  (text, pos) => {
    if (text[pos] !== '[') return null;
    const labelClose = findClosingBracket(text, pos);
    if (labelClose === -1 || text[labelClose + 1] !== '(') return null;
    const parenClose = text.indexOf(')', labelClose + 2);
    if (parenClose === -1) return null;
    const label = text.slice(pos + 1, labelClose);
    const inside = text.slice(labelClose + 2, parenClose).trim();
    const titleMatch = inside.match(/^(.*?)\s+"([^"]*)"$/);
    const href = titleMatch ? titleMatch[1] : inside;
    const title = titleMatch ? titleMatch[2] : undefined;
    return { start: pos, end: parenClose + 1, node: { type: 'link', href, title, children: parseInline(label) } };
  },

  // Footnote reference: [^label]
  (text, pos) => {
    if (text[pos] !== '[' || text[pos + 1] !== '^') return null;
    const close = text.indexOf(']', pos + 2);
    if (close === -1 || text[close + 1] === '(') return null;
    const label = text.slice(pos + 2, close);
    if (!label || /\s/.test(label)) return null;
    return { start: pos, end: close + 1, node: { type: 'footnote_ref', label } };
  },

  // Emoji: :name:
  (text, pos) => {
    if (text[pos] !== ':') return null;
    const match = text.slice(pos).match(/^:([a-zA-Z0-9_+-]+):/);
    if (!match) return null;
    const name = match[1];
    const emoji = EMOJI_MAP[name];
    if (!emoji) return null;
    return { start: pos, end: pos + match[0].length, node: { type: 'emoji', value: emoji, raw: name } };
  },

  // Highlight: ==text==
  (text, pos) => matchDelimited(text, pos, '==', '==', children => ({ type: 'highlight', children })),

  // Bold-italic: ***text*** or ___text___
  (text, pos) => matchDelimited(text, pos, '***', '***', children => ({ type: 'bold_italic', children }))
    ?? matchDelimited(text, pos, '___', '___', children => ({ type: 'bold_italic', children })),

  // Bold: **text** or __text__
  (text, pos) => matchDelimited(text, pos, '**', '**', children => ({ type: 'bold', children })),

  // Underline: __text__ — must come after bold_italic
  (text, pos) => matchDelimited(text, pos, '__', '__', children => ({ type: 'underline', children })),

  // Strikethrough: ~~text~~
  (text, pos) => matchDelimited(text, pos, '~~', '~~', children => ({ type: 'strikethrough', children })),

  // Italic: *text* or _text_ (single)
  (text, pos) => {
    if (text[pos] !== '*' && text[pos] !== '_') return null;
    const c = text[pos];
    if (text[pos + 1] === c) return null; // double = bold, not italic
    const close = text.indexOf(c, pos + 1);
    if (close === -1 || close === pos + 1) return null;
    // For underscore, check word boundaries
    if (c === '_') {
      if (pos > 0 && /\w/.test(text[pos - 1])) return null;
      if (close + 1 < text.length && /\w/.test(text[close + 1])) return null;
    }
    const inner = text.slice(pos + 1, close);
    return { start: pos, end: close + 1, node: { type: 'italic', children: parseInline(inner) } };
  },

  // Auto-link: <URL> or <email>
  (text, pos) => {
    if (text[pos] !== '<') return null;
    const close = text.indexOf('>', pos + 1);
    if (close === -1) return null;
    const inner = text.slice(pos + 1, close);
    if (/^https?:\/\//.test(inner)) {
      return { start: pos, end: close + 1, node: { type: 'link', href: inner, children: [{ type: 'text', value: inner }] } };
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inner)) {
      return { start: pos, end: close + 1, node: { type: 'link', href: `mailto:${inner}`, children: [{ type: 'text', value: inner }] } };
    }
    return null;
  },
];

// ─── Inline helpers ──────────────────────────────────────────────────────────

function findClosingBracket(text: string, openPos: number): number {
  let depth = 0;
  for (let i = openPos; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function matchDelimited(
  text: string,
  pos: number,
  open: string,
  close: string,
  factory: (children: InlineNode[]) => InlineNode,
): InlineMatchResult | null {
  if (!text.startsWith(open, pos)) return null;
  const start = pos + open.length;
  const end = text.indexOf(close, start);
  if (end === -1 || end === start) return null;
  const inner = text.slice(start, end);
  return { start: pos, end: end + close.length, node: factory(parseInline(inner)) };
}

// ─── Slug helper ─────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ─── Common emoji map ────────────────────────────────────────────────────────

const EMOJI_MAP: Record<string, string> = {
  smile: '😄', laughing: '😆', blush: '😊', heart_eyes: '😍', wink: '😉',
  thinking: '🤔', thumbsup: '👍', thumbsdown: '👎', clap: '👏', fire: '🔥',
  rocket: '🚀', star: '⭐', warning: '⚠️', check: '✅', x: '❌',
  info: 'ℹ️', bulb: '💡', gear: '⚙️', lock: '🔒', key: '🔑',
  bug: '🐛', memo: '📝', book: '📖', link: '🔗', pin: '📌',
  calendar: '📅', clock: '🕐', hammer: '🔨', wrench: '🔧', zap: '⚡',
  tada: '🎉', sparkles: '✨', party_popper: '🎉', construction: '🚧',
  eyes: '👀', wave: '👋', pray: '🙏', muscle: '💪', heart: '❤️',
  broken_heart: '💔', coffee: '☕', pizza: '🍕', beer: '🍺',
  art: '🎨', musical_note: '🎵', video_game: '🎮', trophy: '🏆',
  earth_americas: '🌎', sun: '☀️', moon: '🌙', cloud: '☁️', umbrella: '☂️',
  snowflake: '❄️', package: '📦', truck: '🚚', airplane: '✈️',
  hundred: '💯', bangbang: '‼️', question: '❓', exclamation: '❗',
  plus: '➕', minus: '➖', point_right: '👉', point_left: '👈',
  arrow_right: '➡️', arrow_left: '⬅️', arrow_up: '⬆️', arrow_down: '⬇️',
};
