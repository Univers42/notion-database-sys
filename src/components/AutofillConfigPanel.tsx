/* ************************************************************************** */
/*                                                                            */
/*   AutofillConfigPanel.tsx                                                  */
/*                                                                            */
/*   "AI-filled (read-only)" for a select: one checkbox that adds/removes the */
/*   `autofill` config, and the title/text properties whose text is scored.   */
/*   Shown only when the host provides the adapter that can fill it.          */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useHostAdapters } from '../hooks/useHostAdapters';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import type { SchemaProperty } from '../types/database';
import { cn } from '../utils/cn';

/** C153: at most four source properties are scored. */
const MAX_SOURCES = 4;

const SOURCE_TYPES = new Set(['title', 'text']);

export function AutofillConfigPanel({ databaseId, property }: Readonly<{
  databaseId: string;
  property: SchemaProperty;
}>): React.ReactNode {
  const adapter = useHostAdapters().autofill;
  const database = useDatabaseStore((state) => state.databases[databaseId]);
  const updateProperty = useDatabaseStore((state) => state.updateProperty);
  if (!adapter || property.type !== 'select') return null;

  const enabled = Boolean(property.autofill);
  const selected = property.autofill?.sourcePropertyIds ?? [];
  const sources = Object.values(database?.properties ?? {}).filter(
    (candidate) => candidate.id !== property.id && SOURCE_TYPES.has(candidate.type),
  );

  const setEnabled = (next: boolean): void => {
    updateProperty(databaseId, property.id, {
      autofill: next ? { kind: 'sentiment', sourcePropertyIds: [] } : undefined,
    });
  };

  const toggleSource = (sourceId: string): void => {
    const present = selected.includes(sourceId);
    if (!present && selected.length >= MAX_SOURCES) return;
    const next = present ? selected.filter((id) => id !== sourceId) : [...selected, sourceId];
    updateProperty(databaseId, property.id, {
      autofill: { kind: 'sentiment', sourcePropertyIds: next },
    });
  };

  return (
    <div className={cn('px-3 py-2')} data-testid="autofill-config">
      <label className={cn('flex items-center gap-2 text-sm text-ink-body cursor-pointer')}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          aria-label="AI-filled (read-only)"
        />
        <span>AI-filled (read-only)</span>
      </label>
      {enabled && (
        <div className={cn('mt-2 pl-5')}>
          <div className={cn('mb-1 text-xs text-ink-muted')}>Text to score (up to {MAX_SOURCES})</div>
          {sources.length === 0 ? (
            <p className={cn('text-xs text-ink-muted')}>No title or text property to read yet.</p>
          ) : (
            <div className={cn('space-y-1')}>
              {sources.map((source) => {
                const checked = selected.includes(source.id);
                const full = !checked && selected.length >= MAX_SOURCES;
                return (
                  <label
                    key={source.id}
                    className={cn(`flex items-center gap-2 text-xs ${full ? 'text-ink-disabled' : 'text-ink-body cursor-pointer'}`)}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={full}
                      onChange={() => toggleSource(source.id)}
                      aria-label={`Score ${source.name}`}
                    />
                    <span className={cn('truncate')}>{source.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
