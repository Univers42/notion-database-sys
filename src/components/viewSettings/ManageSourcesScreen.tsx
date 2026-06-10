/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ManageSourcesScreen.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * "Manage data sources" (database container level, Notion semantics): every
 * source this database holds — its own schema, explicitly linked sources and
 * the sources views are already bound to — with usage, rename (alias on the
 * linked ref) and unlink (blocked while views still use the source). "Link a
 * data source" opens the catalog picker in pick-only mode.
 */

import React from 'react';
import { useDatabaseStore, useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import {
  listDatabaseSources, linkSource, removeSource, renameSource, type SourceEntry,
} from '../../store/sources/manageSourcesModel';
import { updateDatabaseMeta } from '../../store/sources/dbMetaPersistence';
import { SubPanelHeader } from './SubComponents';
import { SourcePickerScreen } from './SourcePickerScreen';
import { cn } from '../../utils/cn';

interface ManageSourcesScreenProps {
  databaseId: string;
  viewId: string;
  onBack: () => void;
  onClose: () => void;
}

function SourceEntryRow({ entry, onRename, onRemove }: Readonly<{
  entry: SourceEntry;
  onRename: (name: string) => void;
  onRemove: () => void;
}>) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(entry.ref.name);
  const inUse = entry.usedBy.length > 0;
  const commit = () => {
    setEditing(false);
    if (name.trim() && name.trim() !== entry.ref.name) onRename(name.trim());
  };
  return (
    <div className={cn('flex flex-col rounded-md px-2 py-[6px] hover:bg-hover-surface-soft3')}>
      <div className={cn('flex items-center gap-2')}>
        {editing ? (
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)}
            onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') commit(); }}
            aria-label="Source name"
            className={cn('flex-1 rounded border border-line bg-transparent px-1 text-sm outline-none')} />
        ) : (
          <span className={cn('flex-1 text-sm text-ink-body truncate')}>{entry.ref.name}</span>
        )}
        <span className={cn('shrink-0 rounded bg-surface-tertiary px-1.5 text-[10px] uppercase text-ink-muted')}>
          {entry.ref.kind}
        </span>
        {entry.isPrimary && (
          <span className={cn('shrink-0 rounded bg-surface-tertiary px-1.5 text-[10px] text-ink-muted')}>primary</span>
        )}
      </div>
      <div className={cn('flex items-center gap-3 pt-0.5')}>
        <span className={cn('text-xs text-ink-muted')}>
          {inUse ? `Used by ${entry.usedBy.length} view${entry.usedBy.length > 1 ? 's' : ''}: ${entry.usedBy.join(', ')}` : 'Not used by any view'}
        </span>
        {!entry.isPrimary && (
          <span className={cn('ml-auto flex gap-2')}>
            {entry.isLinked && (
              <button onClick={() => setEditing(true)} className={cn('text-xs text-ink-muted hover:text-ink-body')}>Rename</button>
            )}
            {entry.isLinked && !inUse && (
              <button onClick={onRemove} className={cn('text-xs text-danger-text hover:underline')}>Unlink</button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/** Database-container source management screen. */
export function ManageSourcesScreen({ databaseId, viewId, onBack, onClose }: Readonly<ManageSourcesScreenProps>) {
  const { databases, views } = useDatabaseStore();
  const storeApi = useStoreApi();
  const [linking, setLinking] = React.useState(false);
  const database = databases[databaseId];
  if (!database) return null;

  if (linking) {
    return (
      <SourcePickerScreen
        viewId={viewId} currentDatabaseId={databaseId} title="Link a data source"
        onBack={() => setLinking(false)} onClose={onClose}
        onPick={(source) => {
          updateDatabaseMeta(storeApi, databaseId, {
            dataSources: linkSource(database, {
              id: source.id, name: source.name,
              kind: source.id.startsWith('baas:') ? 'live' : source.id.startsWith('ws-') ? 'workspace' : 'known',
            }).dataSources,
          });
          setLinking(false);
        }}
      />
    );
  }

  const entries = listDatabaseSources(database, views, databases);
  return (
    <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
      <SubPanelHeader title="Manage data sources" onBack={onBack} onClose={onClose} />
      <div className={cn('flex-1 overflow-auto px-2 pb-2 flex flex-col gap-px')} style={{ minHeight: 0 }}>
        {entries.map((entry) => (
          <SourceEntryRow key={entry.ref.id} entry={entry}
            onRename={(name) => updateDatabaseMeta(storeApi, databaseId, {
              dataSources: renameSource(database, entry.ref.id, name).dataSources,
            })}
            onRemove={() => {
              const next = removeSource(database, entry.ref.id, views);
              if (next) updateDatabaseMeta(storeApi, databaseId, { dataSources: next.dataSources ?? [] });
            }} />
        ))}
        <button onClick={() => setLinking(true)}
          className={cn('mt-1 w-full rounded-md px-2 py-[7px] text-left text-sm text-accent-text-soft hover:bg-hover-surface-soft2')}>
          + Link a data source
        </button>
        <p className={cn('px-2 pt-2 text-xs text-ink-muted')}>
          Each view shows one source. Use a view&apos;s Source setting to switch what it displays.
        </p>
      </div>
    </div>
  );
}
