// ═══════════════════════════════════════════════════════════════════════════════
// Markdown Shortcuts — block detection + shortcut map
// ═══════════════════════════════════════════════════════════════════════════════
//
// Detects Notion-style markdown shortcuts typed by the user and maps them to
// block types. This module bridges the standalone markdown AST system with the
// Notion app's block editor.
//
// It re-exports the same API surface as the old markdownEngine.ts:
//   detectBlockType(), parseInlineMarkdown(), parseMarkdownToBlocks(), BLOCK_SHORTCUTS
//
// For full markdown rendering, use the parser + renderers instead.
// ═══════════════════════════════════════════════════════════════════════════════

import type { BlockType, Block } from '../../types/database';
import { parse, parseInline } from './parser';
import { renderHtml } from './renderers/html';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlockDetection {
  type: BlockType;
  content: string;
  remainingContent: string;
  checked?: boolean;
}

// ─── Shortcut map (display strings for SlashCommandMenu) ─────────────────────

export const BLOCK_SHORTCUTS: Record<string, string> = {
  heading_1: '# ',
  heading_2: '## ',
  heading_3: '### ',
  heading_4: '#### ',
  bulleted_list: '- ',
  numbered_list: '1. ',
  to_do: '[] ',
  quote: '" ',
  toggle: '> ',
  code: '```',
  divider: '---',
};

// ─── Block detection (shortcut prefix parsing) ──────────────────────────────

function ltrim(s: string): string {
  let i = 0;
  while (i < s.length && s[i] === ' ') i++;
  return s.substring(i);
}

function stripPrefix(s: string, n: number): string {
  let i = n;
  while (i < s.length && s[i] === ' ') i++;
  return s.substring(i);
}

function isRepeated(s: string, c: string): boolean {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== c) return false;
  }
  return true;
}

function isOrdered(s: string): { num: number; rest: string } | null {
  let i = 0;
  while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
  if (i === 0 || i >= s.length) return null;
  if (s[i] !== '.') return null;
  const num = parseInt(s.substring(0, i), 10);
  const rest = stripPrefix(s, i + 1);
  return { num, rest };
}

/**
 * Detect block type from a single line of text.
 * Used by the block editor to auto-convert markdown shortcuts.
 */
export function detectBlockType(text: string): BlockDetection | null {
  const line = ltrim(text);

  // Divider: --- (3+ dashes)
  if (line.length >= 3 && isRepeated(line, '-')) {
    return { type: 'divider', content: '', remainingContent: '' };
  }

  // Code block: ```
  if (line === '```' || line.startsWith('```')) {
    return { type: 'code', content: '', remainingContent: '' };
  }

  // Headings: #### → # (most specific first)
  if (line.startsWith('#### ')) { const c = stripPrefix(line, 5); return { type: 'heading_4', content: c, remainingContent: c }; }
  if (line.startsWith('### '))  { const c = stripPrefix(line, 4); return { type: 'heading_3', content: c, remainingContent: c }; }
  if (line.startsWith('## '))   { const c = stripPrefix(line, 3); return { type: 'heading_2', content: c, remainingContent: c }; }
  if (line.startsWith('# '))    { const c = stripPrefix(line, 2); return { type: 'heading_1', content: c, remainingContent: c }; }

  // To-do: [] or [x]
  if (line.startsWith('[] ') || line.startsWith('[ ] ')) {
    const prefixLen = line.startsWith('[] ') ? 3 : 4;
    const c = stripPrefix(line, prefixLen);
    return { type: 'to_do', content: c, remainingContent: c, checked: false };
  }
  if (line.startsWith('[x] ') || line.startsWith('[X] ')) {
    const c = stripPrefix(line, 4);
    return { type: 'to_do', content: c, remainingContent: c, checked: true };
  }

  // Blockquote: " text or > text
  if (line.startsWith('" ')) { const c = stripPrefix(line, 2); return { type: 'quote', content: c, remainingContent: c }; }
  if (line.startsWith('> ') && !line.startsWith('>![')) {
    const c = stripPrefix(line, 2);
    return { type: 'quote', content: c, remainingContent: c };
  }

  // Bulleted list: - item
  if (line.startsWith('- ')) { const c = stripPrefix(line, 2); return { type: 'bulleted_list', content: c, remainingContent: c }; }

  // Numbered list: 1. item
  const orderedResult = isOrdered(line);
  if (orderedResult) return { type: 'numbered_list', content: orderedResult.rest, remainingContent: orderedResult.rest };

  // Callout: >![type] label
  if (line.startsWith('>![')) {
    const close = line.indexOf(']', 3);
    if (close !== -1) {
      const c = stripPrefix(line, close + 1);
      return { type: 'callout', content: c, remainingContent: c };
    }
  }

  return null;
}

// ─── Inline markdown (HTML output for contentEditable) ──────────────────────

/**
 * Parse inline markdown formatting and return HTML string.
 * Used by EditableContent for rendering inline styles in contentEditable blocks.
 *
 * Uses the full AST-based parser internally for accurate rendering.
 */
export function parseInlineMarkdown(text: string): string {
  // Use the full parser's inline engine → convert to HTML
  const nodes = parseInline(text);
  return renderInlineNodesToHtml(nodes);
}

import type { InlineNode } from './ast';

function renderInlineNodesToHtml(nodes: InlineNode[]): string {
  return nodes.map(node => {
    switch (node.type) {
      case 'text': return escHtml(node.value);
      case 'bold': return `<strong>${renderInlineNodesToHtml(node.children)}</strong>`;
      case 'italic': return `<em>${renderInlineNodesToHtml(node.children)}</em>`;
      case 'bold_italic': return `<strong><em>${renderInlineNodesToHtml(node.children)}</em></strong>`;
      case 'strikethrough': return `<del>${renderInlineNodesToHtml(node.children)}</del>`;
      case 'underline': return `<u>${renderInlineNodesToHtml(node.children)}</u>`;
      case 'code': return `<code class="inline-code">${escHtml(node.value)}</code>`;
      case 'link': return `<a href="${escHtml(node.href)}">${renderInlineNodesToHtml(node.children)}</a>`;
      case 'image': return `<img src="${escHtml(node.src)}" alt="${escHtml(node.alt)}" />`;
      case 'highlight': return `<mark>${renderInlineNodesToHtml(node.children)}</mark>`;
      case 'math_inline': return `<span class="math-inline">${escHtml(node.value)}</span>`;
      case 'emoji': return node.value;
      case 'line_break': return '<br />';
      case 'footnote_ref': return `<sup>[${escHtml(node.label)}]</sup>`;
      default: return '';
    }
  }).join('');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Multi-line markdown → Block[] (for import/paste) ───────────────────────

/**
 * Convert a full markdown string into an array of Notion-style blocks.
 * Uses the full AST parser, then maps to Block types.
 */
export function parseMarkdownToBlocks(markdown: string): Block[] {
  const ast = parse(markdown);
  return ast.flatMap(node => astToBlocks(node));
}

function astToBlocks(node: import('./ast').BlockNode): Block[] {
  switch (node.type) {
    case 'heading': {
      const level = Math.min(node.level, 4);
      const headingType = `heading_${level}` as BlockType;
      return [{ id: crypto.randomUUID(), type: headingType, content: inlineToPlain(node.children) }];
    }
    case 'paragraph':
      return [{ id: crypto.randomUUID(), type: 'paragraph', content: inlineToPlain(node.children) }];
    case 'thematic_break':
      return [{ id: crypto.randomUUID(), type: 'divider', content: '' }];
    case 'blockquote':
      return [{ id: crypto.randomUUID(), type: 'quote', content: node.children.map(c => blockToPlain(c)).join('\n') }];
    case 'code_block':
      return [{ id: crypto.randomUUID(), type: 'code', content: node.value, language: node.lang || 'plaintext' }];
    case 'unordered_list':
      return node.children.map(item => ({
        id: crypto.randomUUID(),
        type: 'bulleted_list' as BlockType,
        content: item.children.map(c => blockToPlain(c)).join('\n'),
      }));
    case 'ordered_list':
      return node.children.map(item => ({
        id: crypto.randomUUID(),
        type: 'numbered_list' as BlockType,
        content: item.children.map(c => blockToPlain(c)).join('\n'),
      }));
    case 'task_list':
      return node.children.map(item => ({
        id: crypto.randomUUID(),
        type: 'to_do' as BlockType,
        content: item.children.map(c => blockToPlain(c)).join('\n'),
        checked: item.checked,
      }));
    case 'callout':
      return [{
        id: crypto.randomUUID(),
        type: 'callout' as BlockType,
        content: node.children.map(c => blockToPlain(c)).join('\n'),
      }];
    case 'table':
      return [{ id: crypto.randomUUID(), type: 'paragraph', content: '[table]' }];
    default:
      return [];
  }
}

function inlineToPlain(nodes: InlineNode[]): string {
  return nodes.map(n => {
    switch (n.type) {
      case 'text': return n.value;
      case 'bold': case 'italic': case 'bold_italic': case 'strikethrough':
      case 'underline': case 'highlight':
        return inlineToPlain(n.children);
      case 'code': return n.value;
      case 'link': return inlineToPlain(n.children);
      case 'image': return n.alt;
      case 'emoji': return n.value;
      case 'line_break': return '\n';
      case 'math_inline': return n.value;
      case 'footnote_ref': return `[${n.label}]`;
      default: return '';
    }
  }).join('');
}

function blockToPlain(node: import('./ast').BlockNode): string {
  switch (node.type) {
    case 'paragraph': return inlineToPlain(node.children);
    case 'heading': return inlineToPlain(node.children);
    default: return '';
  }
}
