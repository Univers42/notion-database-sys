/**
 * Lightweight regex-based syntax tokenizer for code blocks.
 * Each language defines ordered rules; the first match at a position wins.
 * Tokens map to CSS custom properties: var(--syntax-<type>).
 *
 * Token types: keyword, string, number, comment, function, operator,
 * punctuation, type, property, tag, attribute, variable, constant,
 * regex, decorator, builtin
 */

// ─── Types ────────────────────────────────────────────────────────────────

export type TokenType =
  | 'keyword' | 'string' | 'number' | 'comment' | 'function'
  | 'operator' | 'punctuation' | 'type' | 'property' | 'tag'
  | 'attribute' | 'variable' | 'constant' | 'regex' | 'decorator'
  | 'builtin';

export interface Token {
  type: TokenType | 'plain';
  value: string;
}

interface Rule {
  type: TokenType;
  pattern: RegExp;
}

// ─── Language Rule Definitions ────────────────────────────────────────────

// Helper: build a keyword regex from a word list (word-boundary guarded)
const kw = (words: string[]) =>
  new RegExp(`\\b(?:${words.join('|')})\\b`);

// --- Shared patterns ---
const SINGLE_LINE_COMMENT   = /\/\/.*/;
const MULTI_LINE_COMMENT    = /\/\*[\s\S]*?(?:\*\/|$)/;
const HASH_COMMENT          = /#.*/;
const DOUBLE_DASH_COMMENT   = /--.*/;
const DOUBLE_QUOTED_STRING  = /"(?:[^"\\]|\\.)*"/;
const SINGLE_QUOTED_STRING  = /'(?:[^'\\]|\\.)*'/;
const BACKTICK_STRING       = /`(?:[^`\\]|\\.)*`/;
const NUMBER_LITERAL        = /\b(?:0[xXoObB][\da-fA-F_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?)\b/;
const COMMON_OPERATORS      = /[+\-*/%=!<>&|^~?:]+|\.{3}/;
const COMMON_PUNCTUATION    = /[{}()[\];,.]/;

// --- C-family shared rules ---
const cFamilyComments: Rule[] = [
  { type: 'comment', pattern: SINGLE_LINE_COMMENT },
  { type: 'comment', pattern: MULTI_LINE_COMMENT },
];
const cFamilyStrings: Rule[] = [
  { type: 'string', pattern: DOUBLE_QUOTED_STRING },
  { type: 'string', pattern: SINGLE_QUOTED_STRING },
];
const cFamilyLiterals: Rule[] = [
  { type: 'constant', pattern: kw(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']) },
  { type: 'number',   pattern: NUMBER_LITERAL },
];
const cFamilyTail: Rule[] = [
  { type: 'operator',    pattern: COMMON_OPERATORS },
  { type: 'punctuation', pattern: COMMON_PUNCTUATION },
];

// ─── Per-Language Rules ───────────────────────────────────────────────────

const JS_KEYWORDS = [
  'async','await','break','case','catch','class','const','continue',
  'debugger','default','delete','do','else','export','extends',
  'finally','for','from','function','if','import','in','instanceof',
  'let','new','of','return','static','super','switch','this','throw',
  'try','typeof','var','void','while','with','yield',
];

const TS_EXTRA_KEYWORDS = [
  'abstract','as','declare','enum','implements','interface',
  'keyof','module','namespace','never','override','private',
  'protected','public','readonly','satisfies','type','unknown',
];

const jsRules: Rule[] = [
  ...cFamilyComments,
  { type: 'string',    pattern: BACKTICK_STRING },
  ...cFamilyStrings,
  { type: 'regex',     pattern: /\/(?:[^/\\]|\\.)+\/[gimsuvy]*/ },
  { type: 'decorator', pattern: /@\w+/ },
  ...cFamilyLiterals,
  { type: 'keyword',   pattern: kw(JS_KEYWORDS) },
  { type: 'function',  pattern: /\b[a-zA-Z_$]\w*(?=\s*\()/ },
  ...cFamilyTail,
];

const tsRules: Rule[] = [
  ...cFamilyComments,
  { type: 'string',    pattern: BACKTICK_STRING },
  ...cFamilyStrings,
  { type: 'regex',     pattern: /\/(?:[^/\\]|\\.)+\/[gimsuvy]*/ },
  { type: 'decorator', pattern: /@\w+/ },
  ...cFamilyLiterals,
  { type: 'keyword',   pattern: kw([...JS_KEYWORDS, ...TS_EXTRA_KEYWORDS]) },
  { type: 'type',      pattern: /\b[A-Z][a-zA-Z0-9_]*\b/ },
  { type: 'function',  pattern: /\b[a-zA-Z_$]\w*(?=\s*[<(])/ },
  ...cFamilyTail,
];

const pythonRules: Rule[] = [
  { type: 'comment',   pattern: HASH_COMMENT },
  { type: 'string',    pattern: /"""[\s\S]*?(?:"""|$)/ },
  { type: 'string',    pattern: /'''[\s\S]*?(?:'''|$)/ },
  ...cFamilyStrings,
  { type: 'decorator', pattern: /@\w+/ },
  { type: 'constant',  pattern: kw(['True', 'False', 'None']) },
  { type: 'number',    pattern: NUMBER_LITERAL },
  { type: 'keyword',   pattern: kw([
    'and','as','assert','async','await','break','class','continue',
    'def','del','elif','else','except','finally','for','from',
    'global','if','import','in','is','lambda','nonlocal','not',
    'or','pass','raise','return','try','while','with','yield',
  ]) },
  { type: 'builtin',   pattern: kw([
    'print','len','range','int','str','float','list','dict','set',
    'tuple','type','isinstance','enumerate','zip','map','filter',
    'sorted','reversed','abs','min','max','sum','any','all','open',
    'super','property','staticmethod','classmethod','input','format',
  ]) },
  { type: 'function',  pattern: /\b[a-zA-Z_]\w*(?=\s*\()/ },
  { type: 'operator',  pattern: /[+\-*/%=!<>&|^~@]+|\.{3}/ },
  { type: 'punctuation', pattern: /[{}()[\]:;,.]/ },
];

const rustRules: Rule[] = [
  ...cFamilyComments,
  { type: 'string',    pattern: DOUBLE_QUOTED_STRING },
  { type: 'string',    pattern: /b?"(?:[^"\\]|\\.)*"/ },
  { type: 'string',    pattern: /r#*"[\s\S]*?"#*/ },
  { type: 'constant',  pattern: kw(['true', 'false']) },
  { type: 'number',    pattern: NUMBER_LITERAL },
  { type: 'keyword',   pattern: kw([
    'as','async','await','break','const','continue','crate','dyn',
    'else','enum','extern','fn','for','if','impl','in','let','loop',
    'match','mod','move','mut','pub','ref','return','self','Self',
    'static','struct','super','trait','type','unsafe','use','where',
    'while','yield',
  ]) },
  { type: 'type',      pattern: /\b(?:i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Option|Result|Box|Rc|Arc|HashMap|HashSet|BTreeMap|BTreeSet)\b/ },
  { type: 'builtin',   pattern: kw(['println', 'eprintln', 'format', 'panic', 'vec', 'todo', 'unimplemented', 'unreachable']) },
  { type: 'decorator', pattern: /#!?\[[\s\S]*?\]/ },
  { type: 'function',  pattern: /\b[a-zA-Z_]\w*(?=\s*[(<])/ },
  ...cFamilyTail,
];

const cppRules: Rule[] = [
  ...cFamilyComments,
  ...cFamilyStrings,
  { type: 'constant',  pattern: kw(['true', 'false', 'nullptr', 'NULL']) },
  { type: 'number',    pattern: NUMBER_LITERAL },
  { type: 'keyword',   pattern: kw([
    'alignas','alignof','auto','bool','break','case','catch','char',
    'class','const','constexpr','continue','decltype','default','delete',
    'do','double','else','enum','explicit','extern','float','for',
    'friend','goto','if','inline','int','long','mutable','namespace',
    'new','noexcept','operator','private','protected','public','return',
    'short','signed','sizeof','static','struct','switch','template',
    'this','throw','try','typedef','typename','union','unsigned',
    'using','virtual','void','volatile','while',
  ]) },
  { type: 'decorator', pattern: /#\s*(?:include|define|ifdef|ifndef|endif|pragma|if|else|elif|undef|error|warning)\b.*/ },
  { type: 'type',      pattern: /\b(?:size_t|ptrdiff_t|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|string|vector|map|set|unique_ptr|shared_ptr)\b/ },
  { type: 'function',  pattern: /\b[a-zA-Z_]\w*(?=\s*[(<])/ },
  ...cFamilyTail,
];

const cRules: Rule[] = [
  ...cFamilyComments,
  ...cFamilyStrings,
  { type: 'constant',  pattern: kw(['true', 'false', 'NULL']) },
  { type: 'number',    pattern: NUMBER_LITERAL },
  { type: 'keyword',   pattern: kw([
    'auto','break','case','char','const','continue','default','do',
    'double','else','enum','extern','float','for','goto','if','int',
    'long','register','return','short','signed','sizeof','static',
    'struct','switch','typedef','union','unsigned','void','volatile','while',
  ]) },
  { type: 'decorator', pattern: /#\s*(?:include|define|ifdef|ifndef|endif|pragma|if|else|elif|undef|error|warning)\b.*/ },
  { type: 'type',      pattern: /\b(?:size_t|ptrdiff_t|FILE|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t)\b/ },
  { type: 'function',  pattern: /\b[a-zA-Z_]\w*(?=\s*\()/ },
  ...cFamilyTail,
];

const javaRules: Rule[] = [
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

const goRules: Rule[] = [
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

const htmlRules: Rule[] = [
  { type: 'comment',     pattern: /<!--[\s\S]*?(?:-->|$)/ },
  { type: 'tag',         pattern: /<\/?[a-zA-Z][\w-]*/ },
  { type: 'attribute',   pattern: /\b[a-zA-Z_:][\w:.-]*(?=\s*=)/ },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'string',      pattern: SINGLE_QUOTED_STRING },
  { type: 'punctuation', pattern: /[<>/=]/ },
];

const cssRules: Rule[] = [
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

const jsonRules: Rule[] = [
  { type: 'property',    pattern: /"(?:[^"\\]|\\.)*"(?=\s*:)/ },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'number',      pattern: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/ },
  { type: 'constant',    pattern: /\b(?:true|false|null)\b/ },
  { type: 'punctuation', pattern: /[{}[\]:,]/ },
];

const yamlRules: Rule[] = [
  { type: 'comment',     pattern: HASH_COMMENT },
  { type: 'property',    pattern: /^[\w.-]+(?=\s*:)/m },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'string',      pattern: SINGLE_QUOTED_STRING },
  { type: 'constant',    pattern: /\b(?:true|false|null|yes|no|on|off)\b/ },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'keyword',     pattern: /[&*][\w.-]+/ },
  { type: 'punctuation', pattern: /[[\]{},:|>-]/ },
];

const bashRules: Rule[] = [
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

const sqlRules: Rule[] = [
  { type: 'comment',     pattern: DOUBLE_DASH_COMMENT },
  { type: 'comment',     pattern: MULTI_LINE_COMMENT },
  { type: 'string',      pattern: SINGLE_QUOTED_STRING },
  { type: 'string',      pattern: DOUBLE_QUOTED_STRING },
  { type: 'number',      pattern: NUMBER_LITERAL },
  { type: 'keyword',     pattern: /\b(?:SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|JOIN|INNER|LEFT|RIGHT|OUTER|CROSS|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|TOP|VALUES|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|UNIQUE|CASCADE|BEGIN|COMMIT|ROLLBACK|TRANSACTION|GRANT|REVOKE|WITH|CASE|WHEN|THEN|ELSE|END|IF|DECLARE|EXEC|PROCEDURE|FUNCTION|TRIGGER|RETURN)\b/i },
  { type: 'builtin',     pattern: /\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|CONVERT|UPPER|LOWER|TRIM|SUBSTRING|CONCAT|LENGTH|NOW|CURRENT_TIMESTAMP|GETDATE|DATEADD|DATEDIFF|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|OVER|PARTITION)\b/i },
  { type: 'type',        pattern: /\b(?:INT|INTEGER|BIGINT|SMALLINT|TINYINT|FLOAT|DOUBLE|DECIMAL|NUMERIC|VARCHAR|NVARCHAR|CHAR|TEXT|BLOB|BOOLEAN|DATE|DATETIME|TIMESTAMP|TIME|SERIAL|UUID)\b/i },
  { type: 'operator',    pattern: /[=<>!]+|[+\-*/%]/ },
  { type: 'punctuation', pattern: /[();,.*]/ },
];

const rubyRules: Rule[] = [
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

const phpRules: Rule[] = [
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

const swiftRules: Rule[] = [
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

const kotlinRules: Rule[] = [
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

const luaRules: Rule[] = [
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

const tomlRules: Rule[] = [
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

const markdownRules: Rule[] = [
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

// ─── Language → Rule Map ──────────────────────────────────────────────────

const LANGUAGE_RULES: Record<string, Rule[]> = {
  javascript: jsRules,
  typescript: tsRules,
  python:     pythonRules,
  rust:       rustRules,
  cpp:        cppRules,
  c:          cRules,
  java:       javaRules,
  go:         goRules,
  html:       htmlRules,
  css:        cssRules,
  json:       jsonRules,
  yaml:       yamlRules,
  markdown:   markdownRules,
  bash:       bashRules,
  sql:        sqlRules,
  ruby:       rubyRules,
  php:        phpRules,
  swift:      swiftRules,
  kotlin:     kotlinRules,
  lua:        luaRules,
  toml:       tomlRules,
};

// ─── Tokenizer Engine ─────────────────────────────────────────────────────

/**
 * Tokenize a code string for the given language.
 * Returns an array of Token objects with type + value.
 * Unmatched text gets type 'plain'.
 */
export function tokenize(code: string, language: string): Token[] {
  const rules = LANGUAGE_RULES[language];
  if (!rules) {
    return [{ type: 'plain', value: code }];
  }

  const tokens: Token[] = [];
  let pos = 0;

  while (pos < code.length) {
    let bestMatch: { type: TokenType; value: string; end: number } | null = null;

    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      // Clone regex to search from current position
      const re = new RegExp(rule.pattern.source, rule.pattern.flags.replace('g', '') );
      const slice = code.slice(pos);
      const m = re.exec(slice);
      if (m && m.index === 0) {
        // Take the longest match at position 0
        if (!bestMatch || m[0].length > bestMatch.value.length) {
          bestMatch = { type: rule.type, value: m[0], end: pos + m[0].length };
        }
      }
    }

    if (bestMatch) {
      tokens.push({ type: bestMatch.type, value: bestMatch.value });
      pos = bestMatch.end;
    } else {
      // Accumulate plain characters
      const last = tokens[tokens.length - 1];
      if (last && last.type === 'plain') {
        last.value += code[pos];
      } else {
        tokens.push({ type: 'plain', value: code[pos] });
      }
      pos++;
    }
  }

  return tokens;
}

/**
 * Render tokens to an HTML string with <span> tags using CSS custom properties.
 * Plain tokens have no wrapping span.
 */
export function renderTokensToHtml(tokens: Token[]): string {
  return tokens
    .map(t => {
      if (t.type === 'plain') return escapeHtml(t.value);
      return `<span style="color:var(--syntax-${t.type})">${escapeHtml(t.value)}</span>`;
    })
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Get supported language list */
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_RULES);
