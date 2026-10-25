/* ************************************************************************** */
/*                                                                            */
/*   AutofillCellRenderer.tsx                                                 */
/*                                                                            */
/*   A `select` property whose labels the host's AI fills. The cell is       */
/*   READ-ONLY: it never opens an editor and never writes the label into      */
/*   `page.properties` — C155, labels are not state.                          */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useMemo, useState } from 'react';
import type { SchemaProperty } from '../../../../types/database';
import type { CellRendererProps } from '../CellRenderer';
import { useHostAdapters, type AutofillAdapter } from '../../../../hooks/useHostAdapters';
import { cn } from '../../../../utils/cn';

/** What a row with no score (or no adapter) shows. */
export const AUTOFILL_EMPTY = '—';

/** The host cache refreshes every 15 s; re-read on the same cadence. */
const REFRESH_MS = 15_000;

type Labels = Record<string, string | null>;

interface AutofillRead {
  labels: Labels | null;
  request: Promise<Labels> | null;
  listeners: Set<() => void>;
  timer: ReturnType<typeof globalThis.setInterval> | null;
}

const reads = new WeakMap<AutofillAdapter, Map<string, AutofillRead>>();

/** Share reads and one 15 s refresh timer per adapter, database and property. */
function useAutofillLabel(databaseId: string, propertyId: string, recordId: string): string | null {
  const adapter = useHostAdapters().autofill;
  const context = useMemo(() => ({ adapter, databaseId, propertyId, recordId }),
    [adapter, databaseId, propertyId, recordId]);
  const [value, setValue] = useState<{ context: typeof context; label: string | null } | null>(null);

  useEffect(() => {
    if (!adapter) return;
    let propertyReads = reads.get(adapter);
    if (!propertyReads) {
      propertyReads = new Map();
      reads.set(adapter, propertyReads);
    }
    const key = JSON.stringify([databaseId, propertyId]);
    let entry = propertyReads.get(key);
    if (!entry) {
      entry = { labels: null, request: null, listeners: new Set(), timer: null };
      propertyReads.set(key, entry);
    }
    const shared = entry;
    const cache = propertyReads;
    const update = (): void => {
      const label = shared.labels?.[recordId] ?? null;
      setValue((previous) => previous?.context === context && previous.label === label
        ? previous : { context, label });
    };
    const load = (): void => {
      if (shared.request) return;
      const pending = Promise.resolve().then(() => adapter.read(databaseId, propertyId));
      shared.request = pending;
      const finish = (labels: Labels | null): void => {
        if (shared.request !== pending) return;
        shared.request = null;
        if (shared.listeners.size === 0) {
          cache.delete(key);
          return;
        }
        shared.labels = labels;
        shared.listeners.forEach((listener) => listener());
      };
      void pending.then(finish, () => finish(null));
    };

    shared.listeners.add(update);
    update();
    if (shared.listeners.size === 1) {
      load();
      shared.timer = globalThis.setInterval(load, REFRESH_MS);
    }
    return () => {
      shared.listeners.delete(update);
      if (shared.listeners.size === 0) {
        if (shared.timer !== null) globalThis.clearInterval(shared.timer);
        shared.timer = null;
        shared.labels = null;
        if (!shared.request) cache.delete(key);
      }
    };
  }, [adapter, databaseId, propertyId, recordId, context]);

  return value?.context === context ? value.label : null;
}

/**
 * The pill of a label. A select switched to AI-filled keeps its own option
 * ids, so the label is matched by id, then by name, then drawn plain: a label
 * the select has no option for is still the score, never hidden.
 */
export function autofillPill(prop: SchemaProperty, label: string | null): { text: string; color: string } | null {
  if (!label) return null;
  const option = prop.options?.find((candidate) => candidate.id === label)
    ?? prop.options?.find((candidate) => candidate.value.toLowerCase() === label.toLowerCase());
  return { text: option?.value ?? label, color: option?.color ?? 'bg-surface-tertiary text-ink-body' };
}

/** Render the read-only pill shared by table cells and the page modal. */
export function AutofillValue({ prop, recordId, databaseId }: Readonly<{
  prop: SchemaProperty;
  recordId: string;
  databaseId: string;
}>): React.ReactNode {
  const label = useAutofillLabel(databaseId, prop.id, recordId);
  // The adapter returns the option id (`negative`/`neutral`/`positive`), the
  // same id the select renderers look up. A label the schema does not carry is
  // shown as empty, never invented.
  const pill = autofillPill(prop, label);
  if (!pill) return <span className={cn('text-ink-muted text-sm')}>{AUTOFILL_EMPTY}</span>;
  return (
    <div className={cn('flex items-center gap-1.5')}>
      <span className={cn(`inline-block px-2 py-0.5 rounded text-xs font-medium ${pill.color}`)}>{pill.text}</span>
    </div>
  );
}

/** The table cell for an AI-filled `select`: no editor, no `onUpdate`. */
export function AutofillSelectCell(props: CellRendererProps): React.ReactNode {
  return <AutofillValue prop={props.prop} recordId={props.page.id} databaseId={props.databaseId} />;
}
