/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AutomationsScreen.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Automations list. Live mounts persist rules SERVER-side (query-router
 * GET/PUT /:dbId/automations) — they fire for every client writing to the
 * mount. Local databases store rules in the view settings and evaluate
 * them client-side (this session only — copy states the limit honestly).
 */

import React from 'react';
import type { AutomationRule } from '@notion-db/contract-types';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { parseLiveDatabaseId } from '../../store/live/liveTypes';
import { getLiveAutomations, putLiveAutomations } from '../../store/live/liveAutomationsClient';
import { AutomationRuleEditor } from './AutomationRuleEditor';
import { SubPanelHeader } from './SubComponents';
import { cn } from '../../utils/cn';

interface AutomationsScreenProps {
  databaseId: string;
  viewId: string;
  onBack: () => void;
  onClose: () => void;
}

/** Rule list + editor for one database (server-backed on live mounts). */
export function AutomationsScreen({ databaseId, viewId, onBack, onClose }: Readonly<AutomationsScreenProps>) {
  const { databases, views, updateViewSettings } = useDatabaseStore();
  const live = parseLiveDatabaseId(databaseId);
  const database = databases[databaseId];
  const localRules = views[viewId]?.settings?.automations ?? [];
  const [serverRules, setServerRules] = React.useState<AutomationRule[] | null>(live ? null : []);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!live) return undefined;
    let active = true;
    getLiveAutomations(live.dbId)
      .then((rules) => { if (active) setServerRules(rules); })
      .catch((err: Error) => { if (active) { setServerRules([]); setError(err.message); } });
    return () => { active = false; };
  }, [live?.dbId]); // eslint-disable-line react-hooks/exhaustive-deps -- dbId is the identity

  const rules = live ? (serverRules ?? []) : localRules;
  const save = (next: AutomationRule[]) => {
    if (live) {
      setServerRules(next);
      putLiveAutomations(live.dbId, next).catch((err: Error) => setError(err.message));
    } else {
      updateViewSettings(viewId, { automations: next });
    }
  };

  const editingRule = rules.find((rule) => rule.id === editing);
  if (editingRule && database) {
    return (
      <AutomationRuleEditor rule={editingRule} properties={database.properties}
        onChange={(next) => save(rules.map((rule) => (rule.id === next.id ? next : rule)))}
        onBack={() => setEditing(null)} onClose={onClose} />
    );
  }

  return (
    <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
      <SubPanelHeader title="Automations" onBack={onBack} onClose={onClose} />
      <div className={cn('flex-1 overflow-auto px-2 pb-2 flex flex-col gap-px')} style={{ minHeight: 0 }}>
        <p className={cn('px-2 py-1 text-xs text-ink-muted')}>
          {live
            ? 'Rules run on the server — they fire for every client writing to this database.'
            : 'Rules run in this app — they fire for edits made in this session only.'}
        </p>
        {error && <p className={cn('px-2 text-xs text-danger-text')}>{error}</p>}
        {live && serverRules === null && <p className={cn('px-2 py-2 text-xs text-ink-muted')}>Loading rules…</p>}
        {rules.map((rule) => (
          <div key={rule.id} className={cn('flex items-center gap-2 rounded-md px-2 py-[6px] hover:bg-hover-surface-soft3')}>
            <button onClick={() => setEditing(rule.id)} className={cn('flex-1 min-w-0 text-left')}>
              <span className={cn(`block truncate text-sm ${rule.enabled ? 'text-ink-body' : 'text-ink-muted line-through'}`)}>
                {rule.name}
              </span>
              <span className={cn('block text-xs text-ink-muted')}>
                {rule.trigger.replaceAll('_', ' ')} · {rule.actions.length} action{rule.actions.length === 1 ? '' : 's'}
              </span>
            </button>
            <button onClick={() => save(rules.filter((candidate) => candidate.id !== rule.id))}
              aria-label="Delete rule" className={cn('shrink-0 text-xs text-ink-muted hover:text-danger-text')}>✕</button>
          </div>
        ))}
        <button
          onClick={() => {
            const rule: AutomationRule = {
              id: crypto.randomUUID(), name: 'New automation', enabled: true,
              table: live?.table ?? databaseId, trigger: 'row_updated',
              actions: [{ type: 'notify', message: 'Row updated' }],
            };
            save([...rules, rule]);
            setEditing(rule.id);
          }}
          className={cn('mt-1 w-full rounded-md px-2 py-[7px] text-left text-sm text-accent-text-soft hover:bg-hover-surface-soft2')}>
          + New automation
        </button>
      </div>
    </div>
  );
}
