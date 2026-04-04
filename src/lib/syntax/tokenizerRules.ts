// Syntax tokenizer — types, helpers, and core language rules
export type TokenType =
  | 'keyword' | 'string' | 'number' | 'comment' | 'function'
  | 'operator' | 'punctuation' | 'type' | 'property' | 'tag'
  | 'attribute' | 'variable' | 'constant' | 'regex' | 'decorator'
  | 'builtin';

export interface Token {
  type: TokenType | 'plain';
  value: string;
}

export interface Rule {
  type: TokenType;
  pattern: RegExp;
}

// Helper: build a keyword regex from a word list (word-boundary guarded)
export const kw = (words: string[]) =>
  new RegExp(String.raw`\b(?:${words.join('|')})\b`);

// Helper: case-insensitive keyword regex
export const kwi = (words: string[]) =>
  new RegExp(String.raw`\b(?:${words.join('|')})\b`, 'i');

// --- Shared patterns ---
export const SINGLE_LINE_COMMENT   = /\/\/.*/;
export const MULTI_LINE_COMMENT    = /\/\*[\s\S]*?(?:\*\/|$)/;
export const HASH_COMMENT          = /#.*/;
export const DOUBLE_DASH_COMMENT   = /--.*/;
export const DOUBLE_QUOTED_STRING  = /"(?:[^"\\]|\\.)*"/;
export const SINGLE_QUOTED_STRING  = /'(?:[^'\\]|\\.)*'/;
export const BACKTICK_STRING       = /`(?:[^`\\]|\\.)*`/;
const NUM_HEX_OCT_BIN             = /0[xXoObB][\da-fA-F_]+/;
const NUM_DECIMAL                  = /\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?/;
export const NUMBER_LITERAL        = new RegExp(String.raw`\b(?:${NUM_HEX_OCT_BIN.source}|${NUM_DECIMAL.source})\b`);
export const COMMON_OPERATORS      = /[+\-*/%=!<>&|^~?:]+|\.{3}/;
export const COMMON_PUNCTUATION    = /[{}()[\];,.]/;

// --- C-family shared rules ---
export const cFamilyComments: Rule[] = [
  { type: 'comment', pattern: SINGLE_LINE_COMMENT },
  { type: 'comment', pattern: MULTI_LINE_COMMENT },
];
export const cFamilyStrings: Rule[] = [
  { type: 'string', pattern: DOUBLE_QUOTED_STRING },
  { type: 'string', pattern: SINGLE_QUOTED_STRING },
];
export const cFamilyLiterals: Rule[] = [
  { type: 'constant', pattern: kw(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']) },
  { type: 'number',   pattern: NUMBER_LITERAL },
];
export const cFamilyTail: Rule[] = [
  { type: 'operator',    pattern: COMMON_OPERATORS },
  { type: 'punctuation', pattern: COMMON_PUNCTUATION },
];

export const JS_KEYWORDS = [
  'async','await','break','case','catch','class','const','continue',
  'debugger','default','delete','do','else','export','extends',
  'finally','for','from','function','if','import','in','instanceof',
  'let','new','of','return','static','super','switch','this','throw',
  'try','typeof','var','void','while','with','yield',
];

export const TS_EXTRA_KEYWORDS = [
  'abstract','as','declare','enum','implements','interface',
  'keyof','module','namespace','never','override','private',
  'protected','public','readonly','satisfies','type','unknown',
];

export const jsRules: Rule[] = [
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

export const tsRules: Rule[] = [
  ...cFamilyComments,
  { type: 'string',    pattern: BACKTICK_STRING },
  ...cFamilyStrings,
  { type: 'regex',     pattern: /\/(?:[^/\\]|\\.)+\/[gimsuvy]*/ },
  { type: 'decorator', pattern: /@\w+/ },
  ...cFamilyLiterals,
  { type: 'keyword',   pattern: kw([...JS_KEYWORDS, ...TS_EXTRA_KEYWORDS]) },
  { type: 'type',      pattern: /\b[A-Z]\w*\b/ },
  { type: 'function',  pattern: /\b[a-zA-Z_$]\w*(?=\s*[<(])/ },
  ...cFamilyTail,
];

export const pythonRules: Rule[] = [
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

export const rustRules: Rule[] = [
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
  { type: 'type',      pattern: kw(['i8','i16','i32','i64','i128','isize','u8','u16','u32','u64','u128','usize','f32','f64','bool','char','str','String','Vec','Option','Result','Box','Rc','Arc','HashMap','HashSet','BTreeMap','BTreeSet']) },
  { type: 'builtin',   pattern: kw(['println', 'eprintln', 'format', 'panic', 'vec', 'todo', 'unimplemented', 'unreachable']) },
  { type: 'decorator', pattern: /#!?\[[\s\S]*?\]/ },
  { type: 'function',  pattern: /\b[a-zA-Z_]\w*(?=\s*[(<])/ },
  ...cFamilyTail,
];

export const cppRules: Rule[] = [
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

export const cRules: Rule[] = [
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
