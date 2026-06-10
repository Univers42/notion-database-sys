/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AutomationRuleEditor.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Editor for ONE automation rule: name, trigger, optional condition and the
 * action list. Columns are offered from the database's properties; the
 * condition operators are the subset both the server runner and the local
 * planner evaluate.
 */

import React from 'react';
import type { AutomationAction, AutomationRule } from '@notion-db/contract-types';
import { SubPanelHeader } from './SubComponents';
import { ToggleSettingRow } from '../ui/MenuPrimitives';
import { cn } from '../../utils/cn';
import type { SchemaProperty } from '../../types/database';

const TRIGGERS: { id: AutomationRule['trigger']; label: string }[] = [
  { id: 'row_added', label: 'Row added' },
  { id: 'row_updated', label: 'Row edited' },
  { id: 'row_deleted', label: 'Row deleted' },
];
const OPERATORS = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'];
const ACTION_TYPES: { id: AutomationAction['type']; label: string }[] = [
  { id: 'set_property', label: 'Set property' },
  { id: 'notify', label: 'Notify subscribers' },
  { id: 'webhook', label: 'Call webhook (https)' },
];

const selectCls = 'w-full rounded-md border border-line bg-transparent px-1.5 py-1 text-xs outline-none';
const inputCls = 'w-full rounded-md border border-line bg-transparent px-1.5 py-1 text-xs outline-none';

function ActionEditor({ action, columns, onChange, onRemove }: Readonly<{
  action: AutomationAction;
  columns: string[];
  onChange: (next: AutomationAction) => void;
  onRemove: () => void;
}>) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-md border border-line p-2')}>
      <div className={cn('flex items-center gap-2')}>
        <select aria-label="Action type" value={action.type} className={cn(selectCls)}
          onChange={(event) => onChange({ type: event.target.value as AutomationAction['type'] })}>
          {ACTION_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
        <button onClick={onRemove} aria-label="Remove action" className={cn('shrink-0 text-xs text-ink-muted hover:text-danger-text')}>✕</button>
      </div>
      {action.type === 'set_property' && (
        <div className={cn('flex gap-1')}>
          <select aria-label="Column" value={action.column ?? ''} className={cn(selectCls)}
            onChange={(event) => onChange({ ...action, column: event.target.value })}>
            <option value="" disabled>Column…</option>
            {columns.map((column) => <option key={column} value={column}>{column}</option>)}
          </select>
          <input aria-label="Value" placeholder="Value" value={String(action.value ?? '')} className={cn(inputCls)}
            onChange={(event) => onChange({ ...action, value: event.target.value })} />
        </div>
      )}
      {action.type === 'notify' && (
        <input aria-label="Message" placeholder="Message" value={action.message ?? ''} className={cn(inputCls)}
          onChange={(event) => onChange({ ...action, message: event.target.value })} />
      )}
      {action.type === 'webhook' && (
        <input aria-label="Webhook URL" placeholder="https://…" value={action.url ?? ''} className={cn(inputCls)}
          onChange={(event) => onChange({ ...action, url: event.target.value })} />
      )}
    </div>
  );
}

/** Full-rule editor screen body. */
export function AutomationRuleEditor({ rule, properties, onChange, onBack, onClose }: Readonly<{
  rule: AutomationRule;
  properties: Record<string, SchemaProperty>;
  onChange: (next: AutomationRule) => void;
  onBack: () => void;
  onClose: () => void;
}>) {
  const columns = Object.values(properties).map((property) => property.id);
  const patch = (updates: Partial<AutomationRule>) => onChange({ ...rule, ...updates });

  return (
    <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
      <SubPanelHeader title="Edit automation" onBack={onBack} onClose={onClose} />
      <div className={cn('flex-1 overflow-auto px-3 pb-3 flex flex-col gap-2')} style={{ minHeight: 0 }}>
        <input aria-label="Rule name" value={rule.name} className={cn(inputCls)}
          onChange={(event) => patch({ name: event.target.value })} />
        <ToggleSettingRow label="Enabled" checked={rule.enabled} onChange={(enabled) => patch({ enabled })} />
        <div className={cn('text-xs font-medium text-ink-secondary select-none')}>When</div>
        <select aria-label="Trigger" value={rule.trigger} className={cn(selectCls)}
          onChange={(event) => patch({ trigger: event.target.value as AutomationRule['trigger'] })}>
          {TRIGGERS.map((trigger) => <option key={trigger.id} value={trigger.id}>{trigger.label}</option>)}
        </select>
        <div className={cn('text-xs font-medium text-ink-secondary select-none')}>Only if (optional)</div>
        <div className={cn('flex gap-1')}>
          <select aria-label="Condition column" value={rule.condition?.column ?? ''} className={cn(selectCls)}
            onChange={(event) => patch({
              condition: event.target.value
                ? { column: event.target.value, operator: rule.condition?.operator ?? 'equals', value: rule.condition?.value }
                : undefined,
            })}>
            <option value="">No condition</option>
            {columns.map((column) => <option key={column} value={column}>{column}</option>)}
          </select>
          {rule.condition && (
            <select aria-label="Operator" value={rule.condition.operator} className={cn(selectCls)}
              onChange={(event) => patch({
                condition: { ...rule.condition!, operator: event.target.value as NonNullable<AutomationRule['condition']>['operator'] },
              })}>
              {OPERATORS.map((operator) => <option key={operator} value={operator}>{operator.replaceAll('_', ' ')}</option>)}
            </select>
          )}
        </div>
        {rule.condition && !['is_empty', 'is_not_empty'].includes(rule.condition.operator) && (
          <input aria-label="Condition value" placeholder="Value" className={cn(inputCls)}
            value={String(rule.condition.value ?? '')}
            onChange={(event) => patch({ condition: { ...rule.condition!, value: event.target.value } })} />
        )}
        <div className={cn('text-xs font-medium text-ink-secondary select-none')}>Then</div>
        {rule.actions.map((action, index) => (
          <ActionEditor key={`${rule.id}-${index}`} action={action} columns={columns}
            onChange={(next) => patch({ actions: rule.actions.map((a, i) => (i === index ? next : a)) })}
            onRemove={() => patch({ actions: rule.actions.filter((_, i) => i !== index) })} />
        ))}
        {rule.actions.length < 5 && (
          <button onClick={() => patch({ actions: [...rule.actions, { type: 'notify', message: rule.name }] })}
            className={cn('w-full rounded-md px-2 py-[6px] text-left text-sm text-accent-text-soft hover:bg-hover-surface-soft2')}>
            + Add action
          </button>
        )}
      </div>
    </div>
  );
}
