/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ButtonEditorPanel.tsx                               :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 18:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 18:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Button property editor (Notion database buttons) ───────────────────────
// Label + the action list a click runs (edit property / add page / open URL /
// notify / webhook). Reuses the automation ActionEditor — buttons and rules
// share one action model. Legacy single-action configs migrate on first open.

import React, { useState, useRef, useEffect } from 'react';
import { MousePointerClick } from 'lucide-react';
import type { AutomationAction, ButtonConfig } from '@notion-db/contract-types';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { ActionEditor, BUTTON_ACTION_TYPES, automationInputCls } from './viewSettings/AutomationActionEditor';
import { cn } from '../utils/cn';

interface ButtonEditorPanelProps {
  databaseId: string;
  propertyId: string;
  onClose: () => void;
  position?: { top: number; left: number };
}

/** Legacy `{action, url}` configs become an equivalent actions list. */
function initialActions(config: ButtonConfig | undefined): AutomationAction[] {
  if (config?.actions?.length) return config.actions;
  if (config?.action === 'open_url' && config.url) return [{ type: 'open_url', url: config.url }];
  if (config?.action === 'notify') return [{ type: 'notify', message: config.label }];
  return [];
}

/** Panel configuring what a button property does when clicked. */
export function ButtonEditorPanel({ databaseId, propertyId, onClose, position }: Readonly<ButtonEditorPanelProps>) {
  const { databases, updateProperty } = useDatabaseStore();
  const db = databases[databaseId];
  const prop = db?.properties[propertyId];

  const [label, setLabel] = useState(prop?.buttonConfig?.label ?? prop?.name ?? 'Button');
  const [actions, setActions] = useState<AutomationAction[]>(() => initialActions(prop?.buttonConfig));

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const columns = Object.values(db?.properties ?? {})
    .filter(p => !['button', 'formula', 'rollup', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by'].includes(p.type))
    .map(p => ({ id: p.id, name: p.name }));
  const targetDatabases = Object.values(databases)
    .filter(d => d.id !== databaseId)
    .map(d => ({ id: d.id, name: d.name }));

  const save = () => {
    updateProperty(databaseId, propertyId, {
      buttonConfig: { label: label.trim() || 'Button', action: 'notify', actions },
    });
    onClose();
  };

  const style: React.CSSProperties = position
    ? { position: 'fixed', top: Math.min(position.top, window.innerHeight - 460), left: Math.min(position.left, window.innerWidth - 320), zIndex: 70 }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 70 };

  return (
    <div ref={panelRef} style={style} data-testid="button-editor-panel"
      className={cn('w-[300px] bg-surface-primary rounded-xl shadow-2xl border border-line flex flex-col max-h-[70vh]')}>
      <div className={cn('flex items-center gap-2 px-3 pt-3 pb-2 text-sm font-medium text-ink')}>
        <MousePointerClick className={cn('w-4 h-4 text-ink-muted')} /> Edit button
      </div>
      <div className={cn('flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-2')}>
        <input aria-label="Button label" placeholder="Button label" value={label} className={cn(automationInputCls)}
          onChange={e => setLabel(e.target.value)} />
        <div className={cn('text-xs font-medium text-ink-secondary select-none')}>On click</div>
        {actions.map((action, index) => (
          <ActionEditor key={index} action={action} columns={columns}
            actionTypes={BUTTON_ACTION_TYPES} databases={targetDatabases}
            onChange={next => setActions(actions.map((a, i) => (i === index ? next : a)))}
            onRemove={() => setActions(actions.filter((_, i) => i !== index))} />
        ))}
        {actions.length < 5 && (
          <button onClick={() => setActions([...actions, { type: 'set_property' }])}
            className={cn('w-full rounded-md px-2 py-[6px] text-left text-sm text-accent-text-soft hover:bg-hover-surface-soft2')}>
            + Add action
          </button>
        )}
      </div>
      <div className={cn('px-3 py-2 border-t border-line-light flex justify-end gap-2')}>
        <button onClick={onClose} className={cn('px-2.5 py-1 text-xs rounded-md text-ink-muted hover:bg-hover-surface')}>Cancel</button>
        <button onClick={save} className={cn('px-2.5 py-1 text-xs font-medium rounded-md bg-accent text-ink-inverse hover:opacity-90')}>Save</button>
      </div>
    </div>
  );
}
