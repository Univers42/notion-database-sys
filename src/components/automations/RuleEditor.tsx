/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RuleEditor.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { getOperatorsForType, needsValue } from '../filters/constants';
import { isWritableType } from '../../store/validation';
import { isIncompleteFilter } from '../../lib/filter/filterHelpers';
import type { AutomationRuleV2, SchemaProperty } from '../../types/database';
import type { ProgramStep } from '../../types/database';

interface Props {
  rule: AutomationRuleV2;
  properties: Record<string, SchemaProperty>;
  onChange: (next: AutomationRuleV2) => void;
}

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function RuleEditor({ rule, properties, onChange }: Readonly<Props>) {
  const props = Object.values(properties);

  const setTrigger = (trigger: AutomationRuleV2['trigger']) => onChange({ ...rule, trigger });

  const updateCondition = (index: number, patch: Partial<AutomationRuleV2['conditions'][number]>) => {
    const next = [...rule.conditions];
    next[index] = { ...next[index], ...patch };
    onChange({ ...rule, conditions: next });
  };

  const addCondition = () => {
    const first = props[0]?.id ?? '';
    onChange({ ...rule, conditions: [...rule.conditions, { id: uid(), propertyId: first, operator: 'equals', value: null }] });
  };

  const removeCondition = (index: number) => {
    onChange({ ...rule, conditions: rule.conditions.filter((_, i) => i !== index) });
  };

  const updateStep = (index: number, step: ProgramStep) => {
    const next = [...rule.program.steps];
    next[index] = step;
    onChange({ ...rule, program: { ...rule.program, steps: next } });
  };

  const removeStep = (index: number) => {
    onChange({ ...rule, program: { ...rule.program, steps: rule.program.steps.filter((_, i) => i !== index) } });
  };

  const moveStep = (index: number, delta: number) => {
    const next = [...rule.program.steps];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...rule, program: { ...rule.program, steps: next } });
  };

  const addStep = () => {
    const firstWritable = props.find((p) => isWritableType(p.type));
    const step: ProgramStep = firstWritable
      ? { op: 'action', action: { type: 'set_property', property: firstWritable.id, value: '' } }
      : { op: 'action', action: { type: 'notify', message: '' } };
    onChange({ ...rule, program: { ...rule.program, steps: [...rule.program.steps, step] } });
  };

  const changeStepType = (index: number, type: string) => {
    const current = rule.program.steps[index];
    let action: { type: string; [key: string]: unknown } = { type };
    if (type === 'set_property') action = { type, property: '', value: '' };
    if (type === 'notify') action = { type, message: '' };
    if (type === 'webhook') action = { type, url: '' };
    updateStep(index, { op: 'action', action } as ProgramStep);
    void current;
  };

  const writableProps = props.filter((p) => isWritableType(p.type));

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-muted">Name</span>
        <input
          aria-label="Rule name"
          value={rule.name}
          onChange={(e) => onChange({ ...rule, name: e.target.value })}
          className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
        />
      </label>
      {/* When */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">When</legend>
        <select
          aria-label="Trigger"
          value={rule.trigger.type}
          onChange={(e) => {
            if (e.target.value === 'row_added') setTrigger({ type: 'row_added' });
            else if (e.target.value === 'row_deleted') setTrigger({ type: 'row_deleted' });
            else setTrigger({ type: 'property_changed' });
          }}
          className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
        >
          <option value="row_added">Row added</option>
          <option value="property_changed">Property changes</option>
          <option value="row_deleted">Row deleted</option>
        </select>
        {rule.trigger.type === 'property_changed' && (
          <div className="flex flex-col gap-2 pl-2">
            <label className="text-xs text-ink-muted">Property</label>
            <select
              aria-label="Property"
              value={rule.trigger.propertyId ?? ''}
              onChange={(e) => setTrigger({ type: 'property_changed', propertyId: e.target.value || undefined, from: undefined, to: undefined })}
              className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
            >
              <option value="">Any property</option>
              {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {rule.trigger.propertyId && (() => {
              const p = properties[rule.trigger.propertyId as string];
              if (!p || (p.type !== 'select' && p.type !== 'status')) return null;
              return (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-ink-muted">From</label>
                    <select
                      aria-label="From"
                      value={rule.trigger.from === undefined ? '' : String(rule.trigger.from)}
                      onChange={(e) => setTrigger({ ...rule.trigger, type: 'property_changed', from: e.target.value === '' ? undefined : e.target.value })}
                      className="min-h-8 w-full rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
                    >
                      <option value="">Any</option>
                      {p.options?.map((o) => <option key={o.id} value={o.id}>{o.value}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-ink-muted">To</label>
                    <select
                      aria-label="To"
                      value={rule.trigger.to === undefined ? '' : String(rule.trigger.to)}
                      onChange={(e) => setTrigger({ ...rule.trigger, type: 'property_changed', to: e.target.value === '' ? undefined : e.target.value })}
                      className="min-h-8 w-full rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
                    >
                      <option value="">Any</option>
                      {p.options?.map((o) => <option key={o.id} value={o.id}>{o.value}</option>)}
                    </select>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </fieldset>

      {/* Only if */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Only if</legend>
        {rule.conditions.length >= 2 && (
          <select
            aria-label="Conjunction"
            value={rule.conjunction}
            onChange={(e) => onChange({ ...rule, conjunction: e.target.value as 'and' | 'or' })}
            className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
          >
            <option value="and">All conditions (and)</option>
            <option value="or">Any condition (or)</option>
          </select>
        )}
        {rule.conditions.map((condition, index) => {
          const cprop = condition.propertyId ? properties[condition.propertyId] : undefined;
          const ops = getOperatorsForType(cprop?.type ?? 'text');
          const op = condition.operator;
          const showValue = needsValue(op as never);
          return (
            <div key={condition.id} className="flex flex-col gap-1 rounded-md border border-line p-2">
              <select
                aria-label="Condition property"
                value={condition.propertyId}
                onChange={(e) => updateCondition(index, { propertyId: e.target.value })}
                className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
              >
                {props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select
                aria-label="Condition operator"
                value={op}
                onChange={(e) => updateCondition(index, { operator: e.target.value as never })}
                className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
              >
                {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {showValue && (
                cprop && (cprop.type === 'select' || cprop.type === 'status') ? (
                  <select
                    aria-label="Condition value"
                    value={String(condition.value ?? '')}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
                  >
                    {cprop.options?.map((o) => <option key={o.id} value={o.id}>{o.value}</option>)}
                  </select>
                ) : (
                  <input
                    aria-label="Condition value"
                    value={typeof condition.value === 'string' || typeof condition.value === 'number' ? String(condition.value) : ''}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
                  />
                )
              )}
              <button
                type="button"
                onClick={() => removeCondition(index)}
                className="min-h-8 self-start rounded-md px-2 text-xs text-ink-muted hover:text-danger-text"
              >
                Remove condition
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addCondition}
          className="min-h-8 self-start rounded-md px-2 text-sm text-accent-text-soft hover:bg-hover-surface-soft2"
        >
          + Add condition
        </button>
      </fieldset>

      {/* Do */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Do</legend>
        {rule.program.steps.map((step, index) => {
          const action = ((step as { op: string; action?: { type: string; [key: string]: unknown } }).action ?? {}) as { type: string; [key: string]: unknown };
          const type = (action.type as string) ?? 'notify';
          const isLast = index === rule.program.steps.length - 1;
          return (
            <div key={index} className="flex flex-col gap-2 rounded-md border border-line p-2">
              <select
                aria-label="Action type"
                value={type}
                onChange={(e) => changeStepType(index, e.target.value)}
                className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
              >
                <option value="set_property">Set a property</option>
                <option value="notify">Show a message</option>
                <option value="webhook">Call a webhook</option>
              </select>
              {type === 'set_property' && (
                <>
                  <select
                    aria-label="Column"
                    value={String(action.property ?? '')}
                    onChange={(e) => updateStep(index, { op: 'action', action: { type: 'set_property', property: e.target.value, value: action.value ?? '' } } as ProgramStep)}
                    className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
                  >
                    <option value="">Choose property</option>
                    {writableProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {action.property && properties[action.property as string]?.type === 'date' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateStep(index, { op: 'action', action: { type: 'set_property', property: action.property, value: { formula: 'now()' } } } as ProgramStep)}
                        className="min-h-8 rounded-md border border-line px-2 text-xs"
                      >
                        Now
                      </button>
                      <span className="text-xs text-ink-muted">
                        {typeof action.value === 'object' && action.value !== null && 'formula' in (action.value as object) ? 'now()' : ''}
                      </span>
                    </div>
                  ) : null}
                  <input
                    aria-label="Value"
                    value={typeof action.value === 'string' || typeof action.value === 'number' ? String(action.value) : ''}
                    onChange={(e) => updateStep(index, { op: 'action', action: { type: 'set_property', property: action.property, value: e.target.value } } as ProgramStep)}
                    className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
                  />
                </>
              )}
              {type === 'notify' && (
                <input
                  aria-label="Message"
                  value={String(action.message ?? '')}
                  onChange={(e) => updateStep(index, { op: 'action', action: { type: 'notify', message: e.target.value } } as ProgramStep)}
                  className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
                />
              )}
              {type === 'webhook' && (
                <input
                  aria-label="Webhook URL"
                  value={String(action.url ?? '')}
                  onChange={(e) => updateStep(index, { op: 'action', action: { type: 'webhook', url: e.target.value } } as ProgramStep)}
                  className="min-h-8 rounded-md border border-line bg-surface-primary px-2 py-1 text-sm"
                />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => removeStep(index)} className="min-h-8 rounded-md px-2 text-xs text-ink-muted hover:text-danger-text">Remove</button>
                <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} className="min-h-8 rounded-md px-2 text-xs disabled:opacity-40">Move up</button>
                <button type="button" onClick={() => moveStep(index, 1)} disabled={isLast} className="min-h-8 rounded-md px-2 text-xs disabled:opacity-40">Move down</button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addStep}
          className="min-h-8 self-start rounded-md px-2 text-sm text-accent-text-soft hover:bg-hover-surface-soft2"
        >
          + Add action
        </button>
      </fieldset>
    </div>
  );
}