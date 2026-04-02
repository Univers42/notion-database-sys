// Syntax tokenizer — extended language rules (set A)
import type { Rule } from './tokenizerRules';
import { kw, MULTI_LINE_COMMENT, HASH_COMMENT, DOUBLE_QUOTED_STRING, SINGLE_QUOTED_STRING, BACKTICK_STRING, NUMBER_LITERAL, cFamilyComments, cFamilyStrings, cFamilyTail } from './tokenizerRules';

export const javaRules: Rule[] = [
  ...cFamilyComments,
  ...cFamilyStrings,
  { type: 'constant',  pattern: kw(['true', 'false', 'null']) },
  { type: 'number',    pattern: NUMBER_LITERAL },
  { type: 'keyword',   pattern: kw([
    'abstract','assert','break','case','catch','class','continue',
    'default','do','else','enum','extends','final','finally','for',
    'if','implements','import','instanceof','interface','native','new',
    'package','private','protected','public','return','static','strictfp',
    'super','switch','synchronized','this','throw','throws','transient',
    'try','void','volatile','while',
  ]) },
  { type: 'type',      pattern: /\b(?:boolean|byte|char|double|float|int|long|short|String|Object|Integer|Boolean|Double|Float|Long|Short|Byte|Character|List|Map|Set|ArrayList|HashMap|HashSet)\b/ },
  { type: 'decorator', pattern: /@\w+/ },
  { type: 'function',  pattern: /\b[a-zA-Z_]\w*(?=\s*\()/ },
  ...cFamilyTail,
];

export const goRules: Rule[] = [
  ...cFamilyComments,
  ...cFamilyStrings,
  { type: 'string',    pattern: BACKTICK_STRING },
  { type: 'constant',  pattern: kw(['true', 'false', 'nil', 'iota']) },
  { type: 'number',    pattern: NUMBER_LITERAL },
  { type: 'keyword',   pattern: kw([
    'break','case','chan','const','continue','default','defer','else',
    'fallthrough','for','func','go','goto','if','import','interface',
    'map','package','range','return','select','struct','switch','type','var',
  ]) },
  { type: 'type',      pattern: /\b(?:bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr)\b/ },
  { type: 'builtin',   pattern: kw(['append', 'cap', 'close', 'copy', 'delete', 'len', 'make', 'new', 'panic', 'print', 'println', 'recover']) },
  { type: 'function',  pattern: /\b[a-zA-Z_]\w*(?=\s*\()/ },
  ...cFamilyTail,
];

export const htmlRules: Rule[] = [
  { type: 'comment',     pattern: /<!--[\s\S]*?(?:-->|$)/ },
  { type: 'tag',         pattern: /<\/?[a-zA-Z][\w-]*/ },
  { type: 'attribute',   pattern: /\b[a-zA-Z_:][\w:.-]*(?=\s*=)/ },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'string',      pattern: SINGLE_QUOTED_STRING },
  { type: 'punctuation', pattern: /[<>/=]/ },
];

export const cssRules: Rule[] = [
  { type: 'comment',     pattern: MULTI_LINE_COMMENT },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'string',      pattern: SINGLE_QUOTED_STRING },
  { type: 'keyword',     pattern: /@(?:media|import|keyframes|font-face|supports|charset|layer|property|container)\b/ },
  { type: 'property',    pattern: /[a-zA-Z-]+(?=\s*:)/ },
  { type: 'number',      pattern: /\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|fr|deg|rad|turn|s|ms)?\b/ },
  { type: 'constant',    pattern: /#[0-9a-fA-F]{3,8}\b/ },
  { type: 'builtin',     pattern: /\b(?:rgb|rgba|hsl|hsla|var|calc|min|max|clamp|url)\b/ },
  { type: 'type',        pattern: /\.[a-zA-Z_][\w-]*/ },
  { type: 'tag',         pattern: /\b(?:html|body|div|span|a|p|h[1-6]|ul|ol|li|table|tr|td|th|form|input|button|img|section|article|nav|header|footer|main|aside)\b/ },
  { type: 'punctuation', pattern: /[{}();:,]/ },
];

export const jsonRules: Rule[] = [
  { type: 'property',    pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/ },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'number',      pattern: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/ },
  { type: 'constant',    pattern: /\b(?:true|false|null)\b/ },
  { type: 'punctuation', pattern: /[{}[\]:,]/ },
];

export const yamlRules: Rule[] = [
  { type: 'comment',     pattern: HASH_COMMENT },
  { type: 'property',    pattern: /^[\w.-]+(?=\s*:)/m },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'string',      pattern: SINGLE_QUOTED_STRING },
  { type: 'constant',    pattern: /\b(?:true|false|null|yes|no|on|off)\b/ },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'keyword',     pattern: /[&*][\w.-]+/ },
  { type: 'punctuation', pattern: /[[\]{},:|>-]/ },
];

export const bashRules: Rule[] = [
  { type: 'comment',     pattern: HASH_COMMENT },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'string',      pattern: SINGLE_QUOTED_STRING },
  { type: 'variable',    pattern: /\$\{?\w+\}?/ },
  { type: 'keyword',     pattern: kw([
    'if','then','else','elif','fi','for','while','do','done','case',
    'esac','in','function','return','local','export','source',
    'alias','unalias','read','shift','set','unset','declare',
  ]) },
  { type: 'builtin',     pattern: kw([
    'echo','printf','cd','ls','grep','sed','awk','cat','rm','mv','cp',
    'mkdir','chmod','chown','find','xargs','wget','curl','tar','ssh',
    'git','npm','yarn','pip','python','node','docker','make',
  ]) },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'operator',    pattern: /[|&;<>!]+|&&|\|\||>>|<</ },
  { type: 'punctuation', pattern: /[()[\]{}]/ },
];
