// ─── PersonCellEditor — pick a workspace collaborator, or invite one ─────────
// Candidates come from the host's collaborator list (people authorized on the
// workspace); when the host provides none, names already used in this database
// (person values + record authors) are proposed so the editor is never empty.
// "+ Invite" appears when the host wires an invite flow.

import React, { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { PropertyValue } from '../../types/database';
import { useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import { useHostAdapters } from '../../hooks/useHostAdapters';
import { CellPortal } from './CellPortal';
import { cn } from '../../utils/cn';

interface PersonCellEditorProps {
  value: PropertyValue;
  databaseId: string;
  propertyId: string;
  onUpdate: (value: PropertyValue) => void;
  onClose: () => void;
}

function Avatar({ name }: Readonly<{ name: string }>) {
  return (
    <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[10px] font-bold shrink-0")}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function PersonCellEditor({ value, databaseId, propertyId, onUpdate, onClose }: Readonly<PersonCellEditorProps>) {
  const [query, setQuery] = useState('');
  const { collaborators, onInvitePerson } = useHostAdapters();
  const storeApi = useStoreApi();

  const candidates = useMemo(() => {
    if (collaborators?.length) return collaborators.map(entry => entry.name);
    // Fallback: every name this database already knows.
    const state = storeApi.getState();
    const names = new Set<string>();
    for (const page of Object.values(state.pages)) {
      if (page.databaseId !== databaseId) continue;
      const existing = page.properties[propertyId];
      if (typeof existing === 'string' && existing) names.add(existing);
      if (page.createdBy) names.add(page.createdBy);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [collaborators, storeApi, databaseId, propertyId]);

  const filtered = candidates.filter(name => name.toLowerCase().includes(query.toLowerCase()));
  const current = typeof value === 'string' ? value : '';

  return (
    <CellPortal onClose={onClose} minWidth={240}>
      <div className={cn("p-1.5 border-b border-line")}>
        <input
          autoFocus
          aria-label="Search people"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && filtered.length > 0) { onUpdate(filtered[0]); onClose(); }
            if (e.key === 'Enter' && filtered.length === 0 && query.trim()) { onUpdate(query.trim()); onClose(); }
          }}
          placeholder="Search a person…"
          className={cn("w-full px-2 py-1 text-sm bg-surface-secondary rounded-md outline-none text-ink placeholder:text-ink-muted")}
        />
      </div>
      <div className={cn("max-h-52 overflow-y-auto py-1")}>
        {current && (
          <button type="button" onClick={() => { onUpdate(''); onClose(); }}
            className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink-muted hover:bg-hover-surface-soft2")}>
            Clear assignee
          </button>
        )}
        {filtered.map(name => (
          <button key={name} type="button" onClick={() => { onUpdate(name); onClose(); }}
            className={cn(`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink-body hover:bg-hover-surface-soft2 ${name === current ? 'bg-surface-secondary' : ''}`)}>
            <Avatar name={name} />
            <span className={cn("truncate")}>{name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className={cn("px-3 py-2 text-xs text-ink-muted")}>
            {query.trim() ? 'No one matches — Enter assigns the typed name.' : 'No people yet.'}
          </div>
        )}
      </div>
      {onInvitePerson && (
        <div className={cn("border-t border-line p-1")}>
          <button type="button" onClick={() => { onInvitePerson(query.trim()); onClose(); }}
            className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-accent-text-soft hover:bg-hover-surface-accent2 rounded-md")}>
            <UserPlus className={cn("w-3.5 h-3.5")} /> Invite…
          </button>
        </div>
      )}
    </CellPortal>
  );
}
