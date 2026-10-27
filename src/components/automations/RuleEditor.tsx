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
import type { AutomationRuleV2, SchemaProperty } from '../../types/database';
import { RuleStepsFieldset } from './RuleStepsFieldset';

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

      <RuleStepsFieldset rule={rule} properties={properties} onChange={onChange} />
    </div>
  );
}