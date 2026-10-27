/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ruleTemplates.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { AutomationRuleV2, DatabaseSchema, ProgramStep, SchemaProperty } from '../../types/database';

interface TemplateContext {
  newId: () => string;
  ownerId: string | null;
  now: string;
}

interface Template {
  id: string;
  title: string;
  description: string;
  build?: () => AutomationRuleV2;
  unavailable?: string;
}

function firstProperty(database: DatabaseSchema, type: string): SchemaProperty | undefined {
  return Object.values(database.properties).find((property) => property.type === type);
}

function statusCompleteOption(property: SchemaProperty | undefined): string | undefined {
  if (!property) return undefined;
  const completeGroup = property.statusGroups?.find((group) => group.id === 'complete');
  if (completeGroup?.optionIds?.length) return completeGroup.optionIds[0];
  return property.options?.find((option) => /done/i.test(option.value))?.id ?? property.options?.[property.options.length - 1]?.id;
}

function setStep(property: string, value: unknown): ProgramStep {
  return { op: 'action', action: { type: 'set_property', property, value } };
}

function notifyStep(message: string): ProgramStep {
  return { op: 'action', action: { type: 'notify', message } };
}

function rule(ctx: TemplateContext, partial: Partial<AutomationRuleV2>): AutomationRuleV2 {
  return {
    version: 2,
    id: ctx.newId(),
    name: partial.name ?? '',
    enabled: true,
    ownerId: ctx.ownerId,
    trigger: partial.trigger ?? { type: 'row_added' },
    conditions: partial.conditions ?? [],
    conjunction: partial.conjunction ?? 'and',
    program: partial.program ?? { version: 1, steps: [] },
    updatedAt: ctx.now,
    ...partial,
  };
}

export function ruleTemplates(database: DatabaseSchema, ctx: { newId: () => string; ownerId: string | null; now: string }): Array<{ id: string; title: string; description: string; build?: () => AutomationRuleV2; unavailable?: string }> {
  const templates: Template[] = [];

  // stamp-finish
  const statusProp = firstProperty(database, 'status');
  const dateProp = firstProperty(database, 'date') ?? firstProperty(database, 'due_date');
  const doneOption = statusCompleteOption(statusProp);
  if (statusProp && dateProp && doneOption) {
    templates.push({
      id: 'stamp-finish',
      title: 'Stamp the finish date',
      description: 'When a row is marked done, set its finish date to now.',
      build: () => rule(ctx, {
        name: 'Stamp the finish date',
        trigger: { type: 'property_changed', propertyId: statusProp.id, to: doneOption },
        program: { version: 1, steps: [setStep(dateProp.id, { formula: 'now()' })] },
      }),
    });
  } else {
    templates.push({
      id: 'stamp-finish',
      title: 'Stamp the finish date',
      description: 'When a row is marked done, set its finish date to now.',
      unavailable: 'Needs a status and a date property',
    });
  }

  // triage-new
  if (statusProp && statusProp.options?.length) {
    const firstOption = statusProp.options[0].id;
    templates.push({
      id: 'triage-new',
      title: 'Triage new rows',
      description: 'When a row is added, set its status to the first option.',
      build: () => rule(ctx, {
        name: 'Triage new rows',
        trigger: { type: 'row_added' },
        program: { version: 1, steps: [setStep(statusProp.id, firstOption)] },
      }),
    });
  } else {
    templates.push({
      id: 'triage-new',
      title: 'Triage new rows',
      description: 'When a row is added, set its status to the first option.',
      unavailable: 'Needs a status property',
    });
  }

  // log-deleted
  templates.push({
    id: 'log-deleted',
    title: 'Log deleted rows',
    description: 'When a row is deleted, show a message.',
    build: () => rule(ctx, {
      name: 'Log deleted rows',
      trigger: { type: 'row_deleted' },
      program: { version: 1, steps: [notifyStep('Row deleted')] },
    }),
  });

  return templates;
}