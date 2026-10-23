/* ************************************************************************** */
/*                                                                            */
/*   AutofillCellRenderer.tsx                                                 */
/*                                                                            */
/*   A `select` property whose labels the host's AI fills. The cell is       */
/*   READ-ONLY: it never opens an editor and never writes the label into      */
/*   `page.properties` — C155, labels are not state.                          */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useRef, useState } from 'react';
import type { SchemaProperty } from '../../../../types/database';
import type { CellRendererProps } from '../CellRenderer';
import { useHostAdapters } from '../../../../hooks/useHostAdapters';
import { cn } from '../../../../utils/cn';

/** What a row with no score (or no adapter) shows. */
export const AUTOFILL_EMPTY = '—';

/** The host cache refreshes every 15 s; re-read on the same cadence. */
const REFRESH_MS = 15_000;

type Labels = Record<string, string | null>;

/**
 * One read per mount, then one every 15 s. A promise shared by the mount's
 * callers de-dupes the effect's replays (StrictMode, a re-render) without
 * holding anything past the account switch: the state is per mount.
 */
function useAutofillLabel(databaseId: string, propertyId: string, recordId: string): string | null {
  const adapter = useHostAdapters().autofill;
  const [labels, setLabels] = useState<Labels | null>(null);
  const request = useRef<{ key: string; promise: Promise<Labels> } | null>(null);

  useEffect(() => {
    if (!adapter) {
      setLabels(null);
      return;
    }
    const key = `${databaseId}:${propertyId}`;
    let alive = true;

    const load = (): void => {
      let entry = request.current;
      if (!entry || entry.key !== key) {
        entry = { key, promise: adapter.read(databaseId, propertyId) };
        request.current = entry;
        void entry.promise.finally(() => {
          if (request.current === entry) request.current = null;
        });
      }
      entry.promise
        .then((next) => { if (alive) setLabels(next); })
        .catch(() => { if (alive) setLabels(null); });
    };

    load();
    const timer = globalThis.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      globalThis.clearInterval(timer);
    };
  }, [adapter, databaseId, propertyId]);

  return adapter ? labels?.[recordId] ?? null : null;
}

/** The read-only pill shared by the table cell and the page modal. */
export function AutofillValue({ prop, recordId, databaseId }: Readonly<{
  prop: SchemaProperty;
  recordId: string;
  databaseId: string;
}>): React.ReactNode {
  const label = useAutofillLabel(databaseId, prop.id, recordId);
  // The adapter returns the option id (`negative`/`neutral`/`positive`), the
  // same id the select renderers look up. A label the schema does not carry is
  // shown as empty, never invented.
  const option = label ? prop.options?.find((candidate) => candidate.id === label) : undefined;
  if (!option) return <span className={cn('text-ink-muted text-sm')}>{AUTOFILL_EMPTY}</span>;
  return (
    <div className={cn('flex items-center gap-1.5')}>
      <span className={cn(`inline-block px-2 py-0.5 rounded text-xs font-medium ${option.color}`)}>{option.value}</span>
    </div>
  );
}

/** The table cell for an AI-filled `select`: no editor, no `onUpdate`. */
export function AutofillSelectCell(props: CellRendererProps): React.ReactNode {
  return <AutofillValue prop={props.prop} recordId={props.page.id} databaseId={props.databaseId} />;
}
