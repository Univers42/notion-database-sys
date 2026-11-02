import type { SchemaProperty } from '../../component/types';
import { enumOptions } from './liveSchemaMapper';

/**
 * Which columns choose from a set of values (#272). The engine's schema decides first:
 * an enum is a select and a MySQL SET a multi-select with their declared values. What the
 * unified schema leaves untyped is read from the rows: a list held in json or text
 * (`["read","update"]`), an array with no declared values, and text that keeps repeating
 * a few short values with no enum behind it.
 *
 * Caveat: the rows are a sample. A list column whose rows are all empty stays text, options
 * are only the values seen, capped at MAX_OPTIONS, and a text column that merely looks like
 * a list, or repeats a few values by chance, is offered as tags too. A select still accepts
 * a new value, so a wrong guess costs a differently drawn cell, never a refused edit.
 */
const SAMPLE_ROWS = 50;
const MAX_TAG_LENGTH = 40;
const MAX_OPTIONS = 30;
const MIN_REPEATING_ROWS = 20;
const MAX_REPEATING_VALUES = 12;
const MIN_REPEATS_PER_VALUE = 3;
const MAX_CHOICE_LENGTH = 30;
const MYSQL_SET = /^set\((.*)\)$/i;

/** The values a MySQL `SET('a','b')` declares; null for any other native type. */
export function mysqlSetValues(nativeType: string | undefined): string[] | null {
  const declared = MYSQL_SET.exec(nativeType ?? '')?.[1];
  if (!declared) return null;
  return [...declared.matchAll(/'((?:[^']|'')*)'/g)].map((match) => match[1].replaceAll("''", "'"));
}

/** The list a cell holds, as an array or as JSON text; null when it holds anything else. */
export function tagsOfCell(raw: unknown): string[] | null {
  let value = raw;
  if (typeof raw === 'string') {
    if (!raw.trimStart().startsWith('[')) return null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value)) return null;
  return value.every((tag) => typeof tag === 'string' && tag !== '' && tag.length <= MAX_TAG_LENGTH)
    ? value as string[]
    : null;
}

function tagOptionsOf(name: string, rows: Record<string, unknown>[]): string[] | null {
  const seen = new Set<string>();
  let sampled = 0;
  for (const row of rows) {
    const raw = row[name];
    if (raw === null || raw === undefined) continue;
    const tags = tagsOfCell(raw);
    if (!tags) return null;
    tags.forEach((tag) => seen.add(tag));
    sampled += 1;
    if (sampled === SAMPLE_ROWS) break;
  }
  return seen.size > 0 && seen.size <= MAX_OPTIONS ? [...seen].sort((a, b) => a.localeCompare(b)) : null;
}

/** The few short values a text column keeps repeating; null when it reads as free text. */
function repeatingValuesOf(name: string, rows: Record<string, unknown>[]): string[] | null {
  const seen = new Set<string>();
  const sample = rows.slice(0, SAMPLE_ROWS).map((row) => row[name]).filter((value) => value !== null && value !== undefined);
  for (const value of sample) {
    if (typeof value !== 'string' || value === '' || value.length > MAX_CHOICE_LENGTH || value.includes('\n')) return null;
    seen.add(value);
    if (seen.size > MAX_REPEATING_VALUES) return null;
  }
  const repeats = sample.length >= MIN_REPEATING_ROWS && sample.length >= seen.size * MIN_REPEATS_PER_VALUE;
  return repeats ? [...seen].sort((a, b) => a.localeCompare(b)) : null;
}

/** Applies what the rows say to the properties the schema left open, in place. */
export function promoteTagColumns(
  properties: Record<string, SchemaProperty>,
  rows: Record<string, unknown>[],
): void {
  for (const [name, property] of Object.entries(properties)) {
    const openMultiSelect = property.type === 'multi_select' && !property.options?.length;
    if (property.type !== 'text' && property.type !== 'id' && !openMultiSelect) continue;
    const tags = tagOptionsOf(name, rows);
    if (tags) {
      properties[name] = { ...property, type: 'multi_select', options: enumOptions(tags) };
      continue;
    }
    const choices = property.type === 'text' ? repeatingValuesOf(name, rows) : null;
    if (choices) properties[name] = { ...property, type: 'select', options: enumOptions(choices) };
  }
}
