/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ConditionalColorScreen.tsx                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * "Conditional color" screen: ordered rule list (first match wins — same
 * semantics colorForPage applies). A rule is a Filter + color token, so the
 * condition editor is the existing FilterValueEditor and the property picker
 * is FilterPropertyPicker — no new editing machinery.
 */

import React from 'react';
import type { ConditionalColorRule } from '@notion-db/contract-types';
import {
  FilterPropertyPicker, FilterValueEditor, getOperatorsForType,
} from '../FilterComponents';
import { CONDITIONAL_COLOR_TOKENS, conditionalColorToken } from '../../lib/conditionalColor';
import { SubPanelHeader } from './SubComponents';
import { cn } from '../../utils/cn';
import type { PropertyValue, SchemaProperty } from '../../types/database';

interface ConditionalColorScreenProps {
  properties: Record<string, SchemaProperty>;
  rules: readonly ConditionalColorRule[];
  onChange: (rules: ConditionalColorRule[]) => void;
  onBack: () => void;
  onClose: () => void;
}

function ColorSwatchRow({ active, onPick }: Readonly<{ active: string; onPick: (id: string) => void }>) {
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1')}>
      {CONDITIONAL_COLOR_TOKENS.map((token) => (
        <button key={token.id} aria-label={token.label} title={token.label} onClick={() => onPick(token.id)}
          className={cn(`h-5 w-5 rounded-full transition-transform ${active === token.id ? 'ring-2 ring-ring-accent-strong ring-offset-1 scale-110' : 'hover:scale-110'}`)}
          style={{ backgroundColor: token.chart }} />
      ))}
    </div>
  );
}

function RuleRow({ rule, property, onEdit, onDelete }: Readonly<{
  rule: ConditionalColorRule; property: SchemaProperty | undefined;
  onEdit: () => void; onDelete: () => void;
}>) {
  const token = conditionalColorToken(rule.color);
  const valueText = Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value ?? '');
  const optionLabel = property?.options?.find((option) => option.id === rule.value)?.value;
  return (
    <div className={cn('flex items-center gap-2 rounded-md px-2 py-[6px] hover:bg-hover-surface-soft3')}>
      <span className={cn('h-3.5 w-3.5 shrink-0 rounded-full')} style={{ backgroundColor: token?.chart ?? '#64748b' }} />
      <button onClick={onEdit} className={cn('flex-1 min-w-0 text-left')}>
        <span className={cn('block truncate text-sm text-ink-body')}>
          {property?.name ?? rule.propertyId} {rule.operator.replaceAll('_', ' ')} {optionLabel ?? valueText}
        </span>
      </button>
      <button onClick={onDelete} aria-label="Delete rule" className={cn('shrink-0 text-xs text-ink-muted hover:text-danger-text')}>✕</button>
    </div>
  );
}

/** Rule list + add/edit flows for conditional row/card/chart colors. */
export function ConditionalColorScreen({ properties, rules, onChange, onBack, onClose }: Readonly<ConditionalColorScreenProps>) {
  const [mode, setMode] = React.useState<'list' | 'pickProperty' | string>('list'); // string = editing rule id
  const editingRule = rules.find((rule) => rule.id === mode);

  const updateRule = (id: string, updates: Partial<ConditionalColorRule>) =>
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)));

  if (mode === 'pickProperty') {
    return (
      <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
        <FilterPropertyPicker
          title="Color when…" properties={Object.values(properties)}
          onSelect={(propertyId) => {
            const operators = getOperatorsForType(properties[propertyId]?.type || 'text');
            const rule: ConditionalColorRule = {
              id: crypto.randomUUID(), propertyId,
              operator: operators[0].value, value: '', color: 'blue',
            };
            onChange([...rules, rule]);
            setMode(rule.id);
          }}
          onClose={() => setMode('list')}
        />
      </div>
    );
  }

  if (editingRule) {
    const property = properties[editingRule.propertyId];
    return (
      <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
        <SubPanelHeader title="Edit color rule" onBack={() => setMode('list')} onClose={onClose} />
        <div className={cn('px-2')}>
          {property && (
            <FilterValueEditor
              property={property} operator={editingRule.operator}
              value={editingRule.value as PropertyValue}
              onOperatorChange={(operator) => updateRule(editingRule.id, { operator })}
              onValueChange={(value) => updateRule(editingRule.id, { value })}
              onDelete={() => { onChange(rules.filter((rule) => rule.id !== editingRule.id)); setMode('list'); }}
              onClose={() => setMode('list')}
            />
          )}
          <div className={cn('px-2 pt-2 pb-1 text-xs font-medium text-ink-secondary select-none')}>Color</div>
          <ColorSwatchRow active={editingRule.color} onPick={(color) => updateRule(editingRule.id, { color })} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
      <SubPanelHeader title="Conditional color" onBack={onBack} onClose={onClose} />
      <div className={cn('flex-1 overflow-auto px-2 pb-2 flex flex-col gap-px')} style={{ minHeight: 0 }}>
        {rules.length === 0 && (
          <p className={cn('px-2 py-2 text-xs text-ink-muted')}>
            Color rows, cards and chart groups when a condition matches. The first matching rule wins.
          </p>
        )}
        {rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} property={properties[rule.propertyId]}
            onEdit={() => setMode(rule.id)}
            onDelete={() => onChange(rules.filter((candidate) => candidate.id !== rule.id))} />
        ))}
        <button onClick={() => setMode('pickProperty')}
          className={cn('mt-1 w-full rounded-md px-2 py-[7px] text-left text-sm text-accent-text-soft hover:bg-hover-surface-soft2')}>
          + Add a color rule
        </button>
      </div>
    </div>
  );
}
