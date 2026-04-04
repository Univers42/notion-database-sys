// Markdown parser — inline formatting parser
import type { InlineNode } from './ast';
import { EMOJI_MAP } from './parserEmoji';

function handleNewline(nodes: InlineNode[], text: string, pos: number): void {
  const lastNode = nodes.at(-1);
  if (lastNode?.type === 'text' && lastNode.value.endsWith('  ')) {
    lastNode.value = lastNode.value.slice(0, -2);
    nodes.push({ type: 'line_break' });
  } else if (pos > 0 && text[pos - 1] === '\\') {
    if (lastNode?.type === 'text') {
      lastNode.value = lastNode.value.slice(0, -1);
    }
    nodes.push({ type: 'line_break' });
  } else {
    nodes.push({ type: 'text', value: ' ' });
  }
}

function appendChar(nodes: InlineNode[], ch: string): void {
  const lastNode = nodes.at(-1);
  if (lastNode?.type === 'text') {
    lastNode.value += ch;
  } else {
    nodes.push({ type: 'text', value: ch });
  }
}

/** Attempt to match an inline pattern at the given position. */
function tryMatchInline(text: string, pos: number): { start: number; end: number; node: InlineNode } | null {
  for (const matcher of INLINE_MATCHERS) {
    const result = matcher(text, pos);
    if (result) return result;
  }
  return null;
}

export function parseInline(text: string): InlineNode[] {
  if (!text) return [];
  const nodes: InlineNode[] = [];
  let pos = 0;
  while (pos < text.length) {
    const result = tryMatchInline(text, pos);
    if (result) {
      if (result.start > pos) {
        nodes.push({ type: 'text', value: text.slice(pos, result.start) });
      }
      nodes.push(result.node);
      pos = result.end;
    } else if (text[pos] === '\n') {
      handleNewline(nodes, text, pos);
      pos++;
    } else {
      appendChar(nodes, text[pos]);
      pos++;
    }
  }
  return nodes;
}

interface InlineMatchResult {
  start: number;
  end: number;
  node: InlineNode;
}

type InlineMatcher = (text: string, pos: number) => InlineMatchResult | null;
const INLINE_MATCHERS: InlineMatcher[] = [
  (text, pos) => {
    if (text[pos] !== '\\' || pos + 1 >= text.length) return null;
    const next = text[pos + 1];
    if ('\\`*_{}[]()#+-.!|~$='.includes(next)) {
      return { start: pos, end: pos + 2, node: { type: 'text', value: next } };
    }
    return null;
  },
  (text, pos) => {
    if (text[pos] !== '`') return null;
    let ticks = 0;
    let i = pos;
    while (i < text.length && text[i] === '`') { ticks++; i++; }
    const closePattern = '`'.repeat(ticks);
    const closeIdx = text.indexOf(closePattern, i);
    if (closeIdx === -1) return null;
    if (closeIdx + ticks < text.length && text[closeIdx + ticks] === '`') return null;
    const value = text.slice(i, closeIdx).replaceAll('\n', ' ').replace(/^ (.+) $/, '$1');
    return { start: pos, end: closeIdx + ticks, node: { type: 'code', value } };
  },
  (text, pos) => {
    if (text[pos] !== '$' || text[pos + 1] === '$') return null;
    const close = text.indexOf('$', pos + 1);
    if (close === -1 || close === pos + 1) return null;
    return { start: pos, end: close + 1, node: { type: 'math_inline', value: text.slice(pos + 1, close) } };
  },
  (text, pos) => {
    if (text[pos] !== '!' || text[pos + 1] !== '[') return null;
    const altClose = findClosingBracket(text, pos + 1);
    if (altClose === -1 || text[altClose + 1] !== '(') return null;
    const parenClose = text.indexOf(')', altClose + 2);
    if (parenClose === -1) return null;
    const alt = text.slice(pos + 2, altClose);
    const inside = text.slice(altClose + 2, parenClose).trim();
    const titleMatch = /^(.*?)\s+"([^"]*)"$/.exec(inside);
    const src = titleMatch ? titleMatch[1] : inside;
    const title = titleMatch ? titleMatch[2] : undefined;
    return { start: pos, end: parenClose + 1, node: { type: 'image', src, alt, title } };
  },
  (text, pos) => {
    if (text[pos] !== '[') return null;
    const labelClose = findClosingBracket(text, pos);
    if (labelClose === -1 || text[labelClose + 1] !== '(') return null;
    const parenClose = text.indexOf(')', labelClose + 2);
    if (parenClose === -1) return null;
    const label = text.slice(pos + 1, labelClose);
    const inside = text.slice(labelClose + 2, parenClose).trim();
    const titleMatch = /^(.*?)\s+"([^"]*)"$/.exec(inside);
    const href = titleMatch ? titleMatch[1] : inside;
    const title = titleMatch ? titleMatch[2] : undefined;
    return { start: pos, end: parenClose + 1, node: { type: 'link', href, title, children: parseInline(label) } };
  },
  (text, pos) => {
    if (text[pos] !== '[' || text[pos + 1] !== '^') return null;
    const close = text.indexOf(']', pos + 2);
    if (close === -1 || text[close + 1] === '(') return null;
    const label = text.slice(pos + 2, close);
    if (!label || /\s/.test(label)) return null;
    return { start: pos, end: close + 1, node: { type: 'footnote_ref', label } };
  },
  (text, pos) => {
    if (text[pos] !== ':') return null;
    const match = /^:([a-zA-Z0-9_+-]+):/.exec(text.slice(pos));
    if (!match) return null;
    const name = match[1];
    const emoji = EMOJI_MAP[name];
    if (!emoji) return null;
    return { start: pos, end: pos + match[0].length, node: { type: 'emoji', value: emoji, raw: name } };
  },
  (text, pos) => matchDelimited(text, pos, '==', '==', children => ({ type: 'highlight', children })),
  (text, pos) => matchDelimited(text, pos, '***', '***', children => ({ type: 'bold_italic', children }))
    ?? matchDelimited(text, pos, '___', '___', children => ({ type: 'bold_italic', children })),
  (text, pos) => matchDelimited(text, pos, '**', '**', children => ({ type: 'bold', children })),
  (text, pos) => matchDelimited(text, pos, '__', '__', children => ({ type: 'underline', children })),
  (text, pos) => matchDelimited(text, pos, '~~', '~~', children => ({ type: 'strikethrough', children })),
  (text, pos) => {
    if (text[pos] !== '*' && text[pos] !== '_') return null;
    const c = text[pos];
    if (text[pos + 1] === c) return null; // double = bold, not italic
    const close = text.indexOf(c, pos + 1);
    if (close === -1 || close === pos + 1) return null;
    if (c === '_') {
      if (pos > 0 && /\w/.test(text[pos - 1])) return null;
      if (close + 1 < text.length && /\w/.test(text[close + 1])) return null;
    }
    const inner = text.slice(pos + 1, close);
    return { start: pos, end: close + 1, node: { type: 'italic', children: parseInline(inner) } };
  },
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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^\w\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .trim();
}

