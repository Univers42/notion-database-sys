// Markdown shortcuts — block detection and shortcut map
import type { BlockType } from '../../types/database';

export interface BlockDetection {
  type: BlockType;
  content: string;
  remainingContent: string;
  checked?: boolean;
}

export const BLOCK_SHORTCUTS: Record<string, string> = {
  heading_1: '# ',
  heading_2: '## ',
  heading_3: '### ',
  heading_4: '#### ',
  heading_5: '##### ',
  heading_6: '###### ',
  bulleted_list: '- ',
  numbered_list: '1. ',
  to_do: '[] ',
  quote: '" ',
  toggle: '> ',
  code: '```',
  divider: '---',
};

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

  // Headings: ###### → # (most specific first)
  if (line.startsWith('###### ')) { const c = stripPrefix(line, 7); return { type: 'heading_6', content: c, remainingContent: c }; }
  if (line.startsWith('##### '))  { const c = stripPrefix(line, 6); return { type: 'heading_5', content: c, remainingContent: c }; }
  if (line.startsWith('#### '))   { const c = stripPrefix(line, 5); return { type: 'heading_4', content: c, remainingContent: c }; }
  if (line.startsWith('### '))    { const c = stripPrefix(line, 4); return { type: 'heading_3', content: c, remainingContent: c }; }
  if (line.startsWith('## '))     { const c = stripPrefix(line, 3); return { type: 'heading_2', content: c, remainingContent: c }; }
  if (line.startsWith('# '))      { const c = stripPrefix(line, 2); return { type: 'heading_1', content: c, remainingContent: c }; }

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

/**
 * Parse inline markdown formatting and return HTML string.
 * Used by EditableContent for rendering inline styles in contentEditable blocks.
 *
 * Uses the full AST-based parser internally for accurate rendering.
 */
