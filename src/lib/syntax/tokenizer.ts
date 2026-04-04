// Syntax tokenizer — engine and language map
import type { Token, TokenType, Rule } from './tokenizerRules';
export type { Token, TokenType } from './tokenizerRules';
import { jsRules, tsRules, pythonRules, rustRules, cppRules, cRules } from './tokenizerRules';
import { javaRules, goRules, htmlRules, cssRules, jsonRules, yamlRules, bashRules } from './tokenizerRulesExt';
import { sqlRules, rubyRules, phpRules, swiftRules, kotlinRules, luaRules, tomlRules, markdownRules } from './tokenizerRulesMore';

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

function findBestMatch(
  code: string, pos: number, rules: Rule[],
): { type: TokenType; value: string; end: number } | null {
  let bestMatch: { type: TokenType; value: string; end: number } | null = null;
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.replace('g', ''));
    const slice = code.slice(pos);
    const m = re.exec(slice);
    if (m?.index === 0) {
      if (!bestMatch || m[0].length > bestMatch.value.length) {
        bestMatch = { type: rule.type, value: m[0], end: pos + m[0].length };
      }
    }
  }
  return bestMatch;
}

function appendPlainChar(tokens: Token[], ch: string): void {
  const last = tokens.at(-1);
  if (last?.type === 'plain') {
    last.value += ch;
  } else {
    tokens.push({ type: 'plain', value: ch });
  }
}

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
    const bestMatch = findBestMatch(code, pos, rules);
    if (bestMatch) {
      tokens.push({ type: bestMatch.type, value: bestMatch.value });
      pos = bestMatch.end;
    } else {
      appendPlainChar(tokens, code[pos]);
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
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Get supported language list */
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_RULES);

