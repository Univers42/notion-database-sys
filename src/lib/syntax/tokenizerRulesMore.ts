// Syntax tokenizer — extended language rules (set B)
import type { Rule } from './tokenizerRules';
import { kw, kwi, MULTI_LINE_COMMENT, HASH_COMMENT, DOUBLE_DASH_COMMENT, DOUBLE_QUOTED_STRING, SINGLE_QUOTED_STRING, BACKTICK_STRING, NUMBER_LITERAL, cFamilyComments, cFamilyStrings, cFamilyTail } from './tokenizerRules';

export const sqlRules: Rule[] = [
  { type: 'comment',     pattern: DOUBLE_DASH_COMMENT },
  { type: 'comment',     pattern: MULTI_LINE_COMMENT },
  { type: 'string',      pattern: SINGLE_QUOTED_STRING },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'keyword',     pattern: kwi(['SELECT','FROM','WHERE','INSERT','INTO','UPDATE','SET','DELETE','CREATE','ALTER','DROP','TABLE','INDEX','VIEW','JOIN','INNER','LEFT','RIGHT','OUTER','CROSS','ON','AND','OR','NOT','IN','EXISTS','BETWEEN','LIKE','IS','NULL','AS','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','UNION','ALL','DISTINCT','TOP','VALUES','PRIMARY','KEY','FOREIGN','REFERENCES','CONSTRAINT','DEFAULT','CHECK','UNIQUE','CASCADE','BEGIN','COMMIT','ROLLBACK','TRANSACTION','GRANT','REVOKE','WITH','CASE','WHEN','THEN','ELSE','END','IF','DECLARE','EXEC','PROCEDURE','FUNCTION','TRIGGER','RETURN']) },
  { type: 'builtin',     pattern: kwi(['COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','CAST','CONVERT','UPPER','LOWER','TRIM','SUBSTRING','CONCAT','LENGTH','NOW','CURRENT_TIMESTAMP','GETDATE','DATEADD','DATEDIFF','ROW_NUMBER','RANK','DENSE_RANK','LAG','LEAD','OVER','PARTITION']) },
  { type: 'type',        pattern: /\b(?:INT|INTEGER|BIGINT|SMALLINT|TINYINT|FLOAT|DOUBLE|DECIMAL|NUMERIC|VARCHAR|NVARCHAR|CHAR|TEXT|BLOB|BOOLEAN|DATE|DATETIME|TIMESTAMP|TIME|SERIAL|UUID)\b/i },
  { type: 'operator',    pattern: /[=<>!]+|[+\-*/%]/ },
  { type: 'punctuation', pattern: /[();,.*]/ },
];

export const rubyRules: Rule[] = [
  { type: 'comment',     pattern: HASH_COMMENT },
  ...cFamilyStrings,
  { type: 'string',      pattern: /:[a-zA-Z_]\w*/ }, // symbols
  { type: 'constant',    pattern: kw(['true', 'false', 'nil']) },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'keyword',     pattern: kw([
    'alias','and','begin','break','case','class','def','defined',
    'do','else','elsif','end','ensure','for','if','in','module',
    'next','not','or','raise','redo','rescue','retry','return',
    'self','super','then','undef','unless','until','when','while','yield',
  ]) },
  { type: 'variable',    pattern: /[@$]\w+/ },
  { type: 'type',        pattern: /\b[A-Z]\w*\b/ },
  { type: 'function',    pattern: /\b[a-zA-Z_]\w*[?!]?(?=\s*[({])/ },
  { type: 'operator',    pattern: /[+\-*/%=!<>&|^~]+|\.{2,3}|<=>|=>|->/ },
  { type: 'punctuation', pattern: /[{}()[\];,.]/ },
];

export const phpRules: Rule[] = [
  ...cFamilyComments,
  { type: 'comment',     pattern: HASH_COMMENT },
  ...cFamilyStrings,
  { type: 'variable',    pattern: /\$\w+/ },
  { type: 'constant',    pattern: kw(['true', 'false', 'null', 'TRUE', 'FALSE', 'NULL']) },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'keyword',     pattern: kw([
    'abstract','as','break','case','catch','class','clone','const',
    'continue','declare','default','do','else','elseif','enddeclare',
    'endfor','endforeach','endif','endswitch','endwhile','extends','final',
    'finally','for','foreach','function','global','if','implements',
    'instanceof','interface','match','namespace','new','private',
    'protected','public','readonly','return','static','switch','this',
    'throw','trait','try','use','var','while','yield',
  ]) },
  { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*\()/ },
  ...cFamilyTail,
];

export const swiftRules: Rule[] = [
  ...cFamilyComments,
  ...cFamilyStrings,
  { type: 'constant',    pattern: kw(['true', 'false', 'nil']) },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'keyword',     pattern: kw([
    'associatedtype','break','case','catch','class','continue','default',
    'defer','deinit','do','else','enum','extension','fallthrough','for',
    'func','guard','if','import','in','init','inout','is','let','operator',
    'private','protocol','public','repeat','return','self','Self','static',
    'struct','subscript','super','switch','throw','throws','try','typealias',
    'var','where','while','async','await','actor',
  ]) },
  { type: 'type',        pattern: /\b(?:Int|Double|Float|String|Bool|Array|Dictionary|Set|Optional|Any|AnyObject|Void|Character|Error)\b/ },
  { type: 'decorator',   pattern: /@\w+/ },
  { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*\()/ },
  ...cFamilyTail,
];

export const kotlinRules: Rule[] = [
  ...cFamilyComments,
  ...cFamilyStrings,
  { type: 'string',      pattern: BACKTICK_STRING },
  { type: 'constant',    pattern: kw(['true', 'false', 'null']) },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'keyword',     pattern: kw([
    'abstract','as','break','by','catch','class','companion','const',
    'constructor','continue','crossinline','data','do','else','enum',
    'expect','external','final','finally','for','fun','if','import',
    'in','infix','init','inline','inner','interface','internal','is',
    'lateinit','noinline','object','open','operator','out','override',
    'package','private','protected','public','reified','return','sealed',
    'super','suspend','this','throw','try','typealias','val','var',
    'vararg','when','where','while',
  ]) },
  { type: 'type',        pattern: /\b(?:Int|Long|Short|Byte|Double|Float|Boolean|Char|String|Unit|Nothing|Any)\b/ },
  { type: 'decorator',   pattern: /@\w+/ },
  { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*[(<])/ },
  ...cFamilyTail,
];

export const luaRules: Rule[] = [
  { type: 'comment',     pattern: /--\[\[[\s\S]*?(?:\]\]|$)/ },
  { type: 'comment',     pattern: /--.*/},
  ...cFamilyStrings,
  { type: 'string',      pattern: /\[\[[\s\S]*?(?:\]\]|$)/ },
  { type: 'constant',    pattern: kw(['true', 'false', 'nil']) },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'keyword',     pattern: kw([
    'and','break','do','else','elseif','end','for','function','goto',
    'if','in','local','not','or','repeat','return','then','until','while',
  ]) },
  { type: 'builtin',     pattern: kw(['print', 'type', 'tostring', 'tonumber', 'pairs', 'ipairs', 'next', 'select', 'require', 'error', 'pcall', 'xpcall', 'assert', 'rawget', 'rawset', 'setmetatable', 'getmetatable']) },
  { type: 'function',    pattern: /\b[a-zA-Z_]\w*(?=\s*\()/ },
  { type: 'operator',    pattern: /[+\-*/%^#=<>~]+|\.\./ },
  { type: 'punctuation', pattern: /[{}()[\];,.]/ },
];

export const tomlRules: Rule[] = [
  { type: 'comment',     pattern: HASH_COMMENT },
  { type: 'tag',         pattern: /\[[\w.-]+\]/ },
  { type: 'tag',         pattern: /\[\[[\w.-]+\]\]/ },
  { type: 'property',    pattern: /[\w.-]+(?=\s*=)/ },
  { type: 'string',      pattern: /"""[\s\S]*?(?:"""|$)/ },
  { type: 'string',      pattern: /'''[\s\S]*?(?:'''|$)/ },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'string',      pattern: SINGLE_QUOTED_STRING },
  { type: 'constant',    pattern: kw(['true', 'false']) },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'punctuation', pattern: /[=[\]{},.]/ },
];

export const markdownRules: Rule[] = [
  { type: 'keyword',     pattern: /^#{1,6}\s.*/m },
  { type: 'operator',    pattern: /^[*-+]\s/m },
  { type: 'number',      pattern: /^\d+\.\s/m },
  { type: 'string',      pattern: /`[^`]+`/ },
  { type: 'string',      pattern: /```[\s\S]*?```/ },
  { type: 'function',    pattern: /\[.*?\]\(.*?\)/ },
  { type: 'constant',    pattern: /\*\*[^*]+\*\*/ },
  { type: 'variable',    pattern: /\*[^*]+\*/ },
  { type: 'comment',     pattern: /^>.*/m },
  { type: 'punctuation', pattern: /^[-*_]{3,}\s*$/m },
];
