/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RuleStepsFieldset.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { isWritableType } from '../../store/validation';
import type { AutomationRuleV2, ProgramStep, SchemaProperty } from '../../types/database';

interface Props {
  rule: AutomationRuleV2;
  properties: Record<string, SchemaProperty>;
  onChange: (next: AutomationRuleV2) => void;
}

/** The "Do" part of a rule: its steps, in order. */
export function RuleStepsFieldset({ rule, properties, onChange }: Readonly<Props>) {
  const props = Object.values(properties);

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
    let action: { type: string; [key: string]: unknown } = { type };
    if (type === 'set_property') action = { type, property: '', value: '' };
    if (type === 'notify') action = { type, message: '' };
    if (type === 'webhook') action = { type, url: '' };
    updateStep(index, { op: 'action', action } as ProgramStep);
  };

  const writableProps = props.filter((p) => isWritableType(p.type));

  return (
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
  );
}
