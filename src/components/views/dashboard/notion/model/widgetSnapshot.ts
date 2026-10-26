// ─── widgetSnapshot — what a dashboard widget shows, as plain text ───────────
// The host's "Ask AI" quotes it into its assistant's composer, where the user
// reads and edits it before anything is sent. Only what the widget already
// shows the viewer goes in: its view's filtered records and visible properties.
// Values that are ids (people, relations, files) are left out: they say
// nothing to a reader, and a person's id is not the widget's content.

import type { SchemaProperty } from '../../../../../types/database';
import { formatCellValue } from '../../../../../utils/format';

/** Records quoted at most; the host caps the size of the quote as well. */
export const SNAPSHOT_MAX_RECORDS = 25;
/** Properties quoted per record at most, besides its title. */
export const SNAPSHOT_MAX_PROPERTIES = 5;
/** Characters of one value at most. */
const MAX_VALUE_CHARS = 120;

const ID_VALUED: ReadonlySet<SchemaProperty['type']> = new Set([
  'person', 'user', 'assigned_to', 'created_by', 'last_edited_by', 'relation', 'files_media', 'button', 'custom',
]);

function oneLine(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** A cell as words, or null when it is empty or holds ids. */
export function snapshotValue(raw: unknown, property: SchemaProperty): string | null {
  if (ID_VALUED.has(property.type)) return null;
  if (property.type === 'multi_select') {
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const labels = raw.map(id => property.options?.find(option => option.id === id)?.value ?? String(id));
    return oneLine(labels.join(', '), MAX_VALUE_CHARS);
  }
  if (raw !== null && typeof raw === 'object') return null;
  const text = formatCellValue(raw, property);
  return text === '—' ? null : oneLine(text, MAX_VALUE_CHARS) || null;
}

export interface SnapshotInput<R> {
  /** The view's visible property ids, in their order. */
  visibleProperties: readonly string[];
  properties: Readonly<Record<string, SchemaProperty>>;
  /** The view's records as the widget shows them (view and dashboard filters applied). */
  records: readonly R[];
  titleOf: (record: R) => string;
  valueOf: (record: R, propertyId: string) => unknown;
}

/** The record count, then one line per record: its title and its visible values. */
export function widgetSnapshot<R>({ visibleProperties, properties, records, titleOf, valueOf }: SnapshotInput<R>): string {
  const shown = visibleProperties
    .map(id => properties[id])
    // Ids are dropped BEFORE the cap, so they take no room from the words.
    .filter((property): property is SchemaProperty => Boolean(property) && property.type !== 'title' && !ID_VALUED.has(property.type))
    .slice(0, SNAPSHOT_MAX_PROPERTIES);
  const lines = [`${records.length.toLocaleString()} ${records.length === 1 ? 'record' : 'records'}`];
  for (const record of records.slice(0, SNAPSHOT_MAX_RECORDS)) {
    const cells = shown.flatMap(property => {
      const text = snapshotValue(valueOf(record, property.id), property);
      return text ? [`${property.name}: ${text}`] : [];
    });
    const title = oneLine(titleOf(record), MAX_VALUE_CHARS) || 'Untitled';
    lines.push(cells.length > 0 ? `- ${title} — ${cells.join('; ')}` : `- ${title}`);
  }
  if (records.length > SNAPSHOT_MAX_RECORDS) lines.push(`… and ${(records.length - SNAPSHOT_MAX_RECORDS).toLocaleString()} more`);
  return lines.join('\n');
}
