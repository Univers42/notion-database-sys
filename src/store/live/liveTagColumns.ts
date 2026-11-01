import type { SchemaProperty } from '../../component/types';
import { enumOptions } from './liveSchemaMapper';

/**
 * A column holding a list reads as tags (#272): `["read","update"]` arrived as raw JSON
 * text, because a json or text column carries no element type. The rows say it instead.
 *
 * Caveat: the decision rests on the sampled rows, so a list column whose first rows are
 * all empty stays text, and options are only the values seen, capped at MAX_OPTIONS. A
 * text column that merely looks like a list in every sampled row is shown as tags too.
 */
const SAMPLE_ROWS = 50;
const MAX_TAG_LENGTH = 40;
const MAX_OPTIONS = 30;

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

/** Turns every text-shaped column of list values into a multi-select, in place. */
export function promoteTagColumns(
  properties: Record<string, SchemaProperty>,
  rows: Record<string, unknown>[],
): void {
  for (const [name, property] of Object.entries(properties)) {
    if (property.type !== 'text' && property.type !== 'id') continue;
    const values = tagOptionsOf(name, rows);
    if (values) properties[name] = { ...property, type: 'multi_select', options: enumOptions(values) };
  }
}
