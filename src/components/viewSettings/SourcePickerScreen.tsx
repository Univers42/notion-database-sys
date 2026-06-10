/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SourcePickerScreen.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * "Source" sub-screen of the view settings panel: the account-wide catalog
 * (live mounts → tables, workspace tables, local databases) grouped and
 * searchable; picking an entry rebinds the view via bindViewSource. The
 * catalog comes from the app-registered DataSourceProvider — empty when the
 * embedding app registered nothing.
 */

import React from 'react';
import { useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import {
  listRegisteredDataSources, type DataSourceDescriptor,
} from '../../store/sources/dataSourceRegistry';
import { bindViewSource } from '../../store/sources/bindViewSource';
import { SubPanelHeader } from './SubComponents';
import { cn } from '../../utils/cn';

interface SourcePickerScreenProps {
  viewId: string;
  currentDatabaseId: string;
  onBack: () => void;
  onClose: () => void;
  /** Pick-only mode (Manage data sources): the caller handles the choice and
   *  the view is NOT rebound. */
  onPick?: (source: DataSourceDescriptor) => void;
  title?: string;
}

function groupCatalog(catalog: DataSourceDescriptor[], needle: string): [string, DataSourceDescriptor[]][] {
  const groups = new Map<string, DataSourceDescriptor[]>();
  for (const source of catalog) {
    if (needle && !source.name.toLowerCase().includes(needle)
      && !source.group.toLowerCase().includes(needle)) continue;
    const bucket = groups.get(source.group) ?? [];
    bucket.push(source);
    groups.set(source.group, bucket);
  }
  return [...groups.entries()];
}

/** One pickable source row: name, engine/read-only chips, current check. */
function SourceRow({ source, isCurrent, disabled, onPick }: Readonly<{
  source: DataSourceDescriptor; isCurrent: boolean; disabled: boolean; onPick: () => void;
}>) {
  return (
    <button onClick={onPick} disabled={disabled} role="menuitemradio" aria-checked={isCurrent}
      className={cn(`w-full flex items-center gap-2 px-2 py-[6px] text-sm rounded-md transition-colors disabled:opacity-50 ${
        isCurrent ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface-soft2'
      }`)}>
      <span className={cn('flex-1 text-left truncate')}>{source.name}</span>
      {source.engineBadge && (
        <span className={cn('shrink-0 rounded bg-surface-tertiary px-1.5 text-[10px] uppercase text-ink-muted')}>
          {source.engineBadge}
        </span>
      )}
      {source.readOnly && !isCurrent && (
        <span className={cn('shrink-0 rounded bg-surface-tertiary px-1.5 text-[10px] text-ink-muted')}>read-only</span>
      )}
    </button>
  );
}

/** Browses every registered data source; picking one rebinds the view
 *  (or hands the descriptor to `onPick` in pick-only mode). */
export function SourcePickerScreen({
  viewId, currentDatabaseId, onBack, onClose, onPick, title = 'Source',
}: Readonly<SourcePickerScreenProps>) {
  const storeApi = useStoreApi();
  const [catalog, setCatalog] = React.useState<DataSourceDescriptor[] | null>(null);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'binding' | 'error'>('idle');

  React.useEffect(() => {
    let active = true;
    listRegisteredDataSources().then((sources) => { if (active) setCatalog(sources); });
    return () => { active = false; };
  }, []);

  const pick = (source: DataSourceDescriptor) => {
    if (onPick) {
      onPick(source);
      return;
    }
    setStatus('binding');
    bindViewSource(storeApi, viewId, source.id)
      .then(() => onBack())
      .catch(() => setStatus('error'));
  };

  const groups = groupCatalog(catalog ?? [], query.trim().toLowerCase());
  return (
    <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
      <SubPanelHeader title={title} onBack={onBack} onClose={onClose} />
      <div className={cn('px-3 pb-2')}>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Search data sources…" aria-label="Search data sources"
          className={cn('w-full rounded-md border border-line bg-transparent px-2 py-1 text-sm outline-none focus:border-accent-border')} />
      </div>
      <div className={cn('flex-1 overflow-auto px-2 pb-2')} style={{ minHeight: 0 }}>
        {catalog === null && <div className={cn('px-2 py-3 text-sm text-ink-muted')}>Loading sources…</div>}
        {catalog?.length === 0 && (
          <div className={cn('px-2 py-3 text-sm text-ink-muted')}>No data sources available.</div>
        )}
        {status === 'error' && (
          <div className={cn('px-2 py-1 text-xs text-danger-text')}>Could not load that source. Try another.</div>
        )}
        {groups.map(([group, sources]) => (
          <div key={group} className={cn('pb-1')}>
            <div className={cn('px-2 pt-2 pb-1 text-xs font-medium text-ink-secondary select-none')}>{group}</div>
            {sources.map((source) => (
              <SourceRow key={source.id} source={source} isCurrent={source.id === currentDatabaseId}
                disabled={status === 'binding'} onPick={() => pick(source)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
