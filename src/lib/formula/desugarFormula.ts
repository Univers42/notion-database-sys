/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   desugarFormula.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Excel-style sugar for the native formula engine. A leading "=" is the mode
// switch (Excel muscle memory): expressions that start with "=" get normalized
// into the engine's own grammar; everything else passes through untouched, so
// existing native formulas keep working byte-for-byte. All rewrites skip string
// literals, so text content is never mangled.
//
//   =Qty * 2              → Qty * 2
//   =A & B                → A + B          ("+" concatenates in the engine)
//   =A <> B               → A != B
//   =IF(A = B, 1, 0)      → if(A == B, 1, 0)
//   =AVERAGE(Score)       → mean(Score)
//   =[Total Price] * 2    → prop("Total Price") * 2   (multi-word column ref)

import { FORMULA_FUNCTIONS } from '../../components/formulaEditor/catalogData';

/** Canonical engine function names, indexed by their lowercase form so an
 *  Excel-uppercase call (SUM, DateAdd) folds to the right casing. Sourced from
 *  the SAME catalog the graphical formula editor renders — one source of truth,
 *  so a function added there is understood here for free. */
const NATIVE_BY_LOWER: Map<string, string> = new Map(
  FORMULA_FUNCTIONS.map(fn => [fn.name.toLowerCase(), fn.name]),
);

/** Excel function names that map to a differently-named engine primitive. */
const FN_ALIASES: Record<string, string> = {
  average: 'mean',
  concatenate: 'concat',
  len: 'length',
  ceiling: 'ceil',
  power: 'pow',
};

const IDENT_START = /[A-Za-z_]/;
const IDENT_PART = /[A-Za-z0-9_]/;

/** Maps a called identifier to its engine name (Excel alias, else case-fold to
 *  the canonical native name; an unknown name is left as typed so the engine
 *  reports it rather than silently mis-evaluating). */
function mapFunctionName(name: string): string {
  const lower = name.toLowerCase();
  return FN_ALIASES[lower] ?? NATIVE_BY_LOWER.get(lower) ?? name;
}

/** Returns the whole string literal starting at `i` (quotes included), honoring
 *  backslash escapes so an embedded quote doesn't end it early. */
function scanString(src: string, i: number): { text: string; next: number } {
  const quote = src[i];
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === quote) { j += 1; break; }
    j += 1;
  }
  return { text: src.slice(i, j), next: j };
}

/** Rewrites Excel idioms → engine grammar over an already-"="-stripped body. */
function rewrite(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      const { text, next } = scanString(src, i);
      out += text; i = next; continue;
    }
    if (IDENT_START.test(ch)) {
      let j = i + 1;
      while (j < src.length && IDENT_PART.test(src[j])) j += 1;
      const name = src.slice(i, j);
      let k = j;
      while (k < src.length && (src[k] === ' ' || src[k] === '\t')) k += 1;
      const lower = name.toLowerCase();
      if (src[k] === '(') out += mapFunctionName(name);
      else if (lower === 'true' || lower === 'false') out += lower;
      else out += name;                 // property reference — keep as typed
      i = j; continue;
    }
    if (ch === '[') {
      const close = src.indexOf(']', i + 1);
      const inner = close === -1 ? '' : src.slice(i + 1, close);
      // Multi-word column ref → prop("…"); single tokens and array literals
      // ([1, 2]) the engine already understands, so leave them alone.
      if (close !== -1 && inner.includes(' ') && !/[,'"]/.test(inner)) {
        out += `prop(${JSON.stringify(inner.trim())})`;
        i = close + 1; continue;
      }
      out += ch; i += 1; continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '<>') { out += '!='; i += 2; continue; }
    if (two === '>=' || two === '<=' || two === '==' || two === '!=' || two === '=>') {
      out += two; i += 2; continue;
    }
    if (ch === '&') { out += '+'; i += 1; continue; }
    if (ch === '=') { out += '=='; i += 1; continue; }
    out += ch; i += 1;
  }
  return out;
}

/**
 * Normalizes an Excel-style "=…" formula into the native engine grammar.
 * Idempotent, and a no-op for any expression that doesn't start with "=".
 */
export function desugarFormula(input: string): string {
  if (typeof input !== 'string') return input;
  const trimmed = input.trimStart();
  if (!trimmed.startsWith('=')) return input;
  return rewrite(trimmed.slice(1));
}
