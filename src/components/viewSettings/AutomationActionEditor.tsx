/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AutomationActionEditor.tsx                          :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 18:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 18:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── One automation ACTION row — shared by rules and database buttons ───────
// Rules plan set_property/notify/webhook; buttons additionally run open_url
// and add_page (browser-gesture / row-context actions the planner ignores).

import React from 'react';
import type { AutomationAction } from '@notion-db/contract-types';
import { cn } from '../../utils/cn';

export interface ActionColumn { id: string; name: string }
export interface ActionDatabase { id: string; name: string }
type ActionTypeOption = { id: AutomationAction['type']; label: string };

export const RULE_ACTION_TYPES: ActionTypeOption[] = [
  { id: 'set_property', label: 'Set property' },
  { id: 'notify', label: 'Notify subscribers' },
  { id: 'webhook', label: 'Call webhook (https)' },
];
export const BUTTON_ACTION_TYPES: ActionTypeOption[] = [
  ...RULE_ACTION_TYPES,
  { id: 'add_page', label: 'Add page to…' },
  { id: 'open_url', label: 'Open URL' },
];

export const automationSelectCls = 'w-full rounded-md border border-line bg-transparent px-1.5 py-1 text-xs outline-none';
export const automationInputCls = 'w-full rounded-md border border-line bg-transparent px-1.5 py-1 text-xs outline-none';

/** Editor for one action: type select + per-type inputs. */
export function ActionEditor({ action, columns, actionTypes = RULE_ACTION_TYPES, databases, onChange, onRemove }: Readonly<{
  action: AutomationAction;
  columns: ActionColumn[];
  /** Offered action types — rules and buttons differ. */
  actionTypes?: ActionTypeOption[];
  /** add_page targets (button editor only); absent → same database only. */
  databases?: ActionDatabase[];
  onChange: (next: AutomationAction) => void;
  onRemove: () => void;
}>) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-md border border-line p-2')}>
      <div className={cn('flex items-center gap-2')}>
        <select aria-label="Action type" value={action.type} className={cn(automationSelectCls)}
          onChange={(event) => onChange({ type: event.target.value as AutomationAction['type'] })}>
          {actionTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
        <button onClick={onRemove} aria-label="Remove action" className={cn('shrink-0 text-xs text-ink-muted hover:text-danger-text')}>✕</button>
      </div>
      {action.type === 'set_property' && (
        <div className={cn('flex gap-1')}>
          <select aria-label="Column" value={action.column ?? ''} className={cn(automationSelectCls)}
            onChange={(event) => onChange({ ...action, column: event.target.value })}>
            <option value="" disabled>Column…</option>
            {columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
          </select>
          <input aria-label="Value" placeholder="Value" value={String(action.value ?? '')} className={cn(automationInputCls)}
            onChange={(event) => onChange({ ...action, value: event.target.value })} />
        </div>
      )}
      {action.type === 'notify' && (
        <input aria-label="Message" placeholder="Message" value={action.message ?? ''} className={cn(automationInputCls)}
          onChange={(event) => onChange({ ...action, message: event.target.value })} />
      )}
      {action.type === 'webhook' && (
        <input aria-label="Webhook URL" placeholder="https://…" value={action.url ?? ''} className={cn(automationInputCls)}
          onChange={(event) => onChange({ ...action, url: event.target.value })} />
      )}
      {action.type === 'open_url' && (
        <input aria-label="URL to open" placeholder="https://…" value={action.url ?? ''} className={cn(automationInputCls)}
          onChange={(event) => onChange({ ...action, url: event.target.value })} />
      )}
      {action.type === 'add_page' && (
        <select aria-label="Target database" value={action.targetDatabaseId ?? ''} className={cn(automationSelectCls)}
          onChange={(event) => onChange({ ...action, targetDatabaseId: event.target.value || undefined })}>
          <option value="">This database</option>
          {(databases ?? []).map((db) => <option key={db.id} value={db.id}>{db.name}</option>)}
        </select>
      )}
    </div>
  );
}
