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
import type { AutomationRule } from '@notion-db/contract-types';
import { SubPanelHeader } from './SubComponents';
import { ToggleSettingRow } from '../ui/MenuPrimitives';
import { ActionEditor, RULE_ACTION_TYPES, automationSelectCls as selectCls, automationInputCls as inputCls } from './AutomationActionEditor';
import { cn } from '../../utils/cn';
import type { SchemaProperty } from '../../types/database';

const TRIGGERS: { id: AutomationRule['trigger']; label: string }[] = [
  { id: 'row_added', label: 'Row added' },
  { id: 'row_updated', label: 'Row edited' },
  { id: 'row_deleted', label: 'Row deleted' },
];
const OPERATORS = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'];
/** Full-rule editor screen body. */
export function AutomationRuleEditor({ rule, properties, onChange, onBack, onClose }: Readonly<{
  rule: AutomationRule;
  properties: Record<string, SchemaProperty>;
  onChange: (next: AutomationRule) => void;
  onBack: () => void;
  onClose: () => void;
}>) {
  const columns = Object.values(properties).map((property) => ({ id: property.id, name: property.name }));
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
        {rule.trigger === 'row_updated' && (
          <select aria-label="Watch property" value={rule.watchColumn ?? ''} className={cn(selectCls)}
            onChange={(event) => patch({ watchColumn: event.target.value || undefined })}>
            <option value="">Any property</option>
            {columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
          </select>
        )}
        <div className={cn('text-xs font-medium text-ink-secondary select-none')}>Only if (optional)</div>
        <div className={cn('flex gap-1')}>
          <select aria-label="Condition column" value={rule.condition?.column ?? ''} className={cn(selectCls)}
            onChange={(event) => patch({
              condition: event.target.value
                ? { column: event.target.value, operator: rule.condition?.operator ?? 'equals', value: rule.condition?.value }
                : undefined,
            })}>
            <option value="">No condition</option>
            {columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}
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
          <ActionEditor key={`${rule.id}-${index}`} action={action} columns={columns} actionTypes={RULE_ACTION_TYPES}
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
