// Markdown Parser — full CommonMark + GFM parser, zero dependencies

import type { BlockNode } from './ast';
import { parseInline, slugify } from './parserInline';
import type { ParseContext } from './parserBlockHelpers';
import {
  peek, advance, isThematicBreak, isSetextHeading,
  parseFencedCode, parseMathBlock, isHtmlBlockTag, parseHtmlBlock,
  isTableStart, parseTable, parseIndentedCode, parseParagraph,
} from './parserBlockHelpers';
import {
  parseBlockquote, parseCallout, parseTaskList,
  parseUnorderedList, parseOrderedList, parseFootnoteDef,
} from './parserBlockNested';

export { parseInline } from './parserInline';

export function parse(markdown: string): BlockNode[] {
  const lines = markdown.split('\n');
  const ctx: ParseContext = { lines, pos: 0 };
  return parseBlocks(ctx, 0);
}

function parseBlocks(ctx: ParseContext, indent: number): BlockNode[] {
  const blocks: BlockNode[] = [];

  while (ctx.pos < ctx.lines.length) {
    const line = peek(ctx)!;
    const trimmed = line.trimStart();
    const lineIndent = line.length - trimmed.length;

    if (trimmed === '') { advance(ctx); continue; }
    if (isThematicBreak(trimmed)) { advance(ctx); blocks.push({ type: 'thematic_break' }); continue; }

    const hm = trimmed.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
    if (hm) {
      advance(ctx);
      const level = hm[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({ type: 'heading', level, children: parseInline(hm[2]), id: slugify(hm[2]) });
      continue;
    }

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) { blocks.push(parseFencedCode(ctx)); continue; }
    if (trimmed.startsWith('$$')) { blocks.push(parseMathBlock(ctx)); continue; }
    if (/^<([a-zA-Z][a-zA-Z0-9-]*)[\s>/]/.test(trimmed) && isHtmlBlockTag(trimmed)) { blocks.push(parseHtmlBlock(ctx)); continue; }
    if (isTableStart(ctx)) { blocks.push(parseTable(ctx)); continue; }
    if (/^>\s*\[!(\w+)\]/.test(trimmed)) { blocks.push(parseCallout(ctx, parseBlocks)); continue; }
    if (trimmed.startsWith('> ') || trimmed === '>') { blocks.push(parseBlockquote(ctx, parseBlocks)); continue; }
    if (/^[-*+]\s+\[([ xX])\]\s/.test(trimmed)) { blocks.push(parseTaskList(ctx, parseBlocks)); continue; }
    if (/^[-*+]\s+/.test(trimmed) && !isThematicBreak(trimmed)) { blocks.push(parseUnorderedList(ctx, parseBlocks)); continue; }
    if (/^\d{1,9}[.)]\s+/.test(trimmed)) { blocks.push(parseOrderedList(ctx, parseBlocks)); continue; }
    if (/^\[\^([^\]]+)\]:\s/.test(trimmed)) { blocks.push(parseFootnoteDef(ctx, parseBlocks)); continue; }
    if (lineIndent >= 4 && indent === 0) { blocks.push(parseIndentedCode(ctx)); continue; }
    if (isSetextHeading(ctx)) {
      const textLine = advance(ctx);
      const ml = advance(ctx);
      const lv = ml.trim().startsWith('=') ? 1 : 2;
      blocks.push({ type: 'heading', level: lv as 1 | 2, children: parseInline(textLine.trim()), id: slugify(textLine.trim()) });
      continue;
    }
    blocks.push(parseParagraph(ctx));
  }

  return blocks;
}
