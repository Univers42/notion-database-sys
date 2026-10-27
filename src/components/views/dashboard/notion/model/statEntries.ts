/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   statEntries.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── statEntries — the "Show as" KPI entries shared by picker and widget menu ─
// One list: Count, checkbox counts, distinct counts, and min/max/sum/avg for
// every number column. Both the AddWidgetPicker and DashboardWidgetFrame read
// from here so the two cannot drift apart.

import type { DashboardStatConfig, SchemaProperty } from '../../../../../types/database';

export interface StatEntry {
  label: string;
  stat: DashboardStatConfig;
}

type PropertySource =
  | Record<string, SchemaProperty>
  | readonly SchemaProperty[]
  | { numberProps?: readonly SchemaProperty[]; checkboxProps?: readonly SchemaProperty[]; selectProps?: readonly SchemaProperty[] };

function asArray(source: PropertySource): { numbers: SchemaProperty[]; checkboxes: SchemaProperty[]; selects: SchemaProperty[] } {
  if (Array.isArray(source)) {
    const numbers: SchemaProperty[] = [];
    const checkboxes: SchemaProperty[] = [];
    const selects: SchemaProperty[] = [];
    for (const prop of source) {
      if (prop.type === 'checkbox') checkboxes.push(prop);
      else if (prop.type === 'select' || prop.type === 'status') selects.push(prop);
      else if (prop.type === 'number' || prop.type === 'formula' || prop.type === 'rollup') numbers.push(prop);
    }
    return { numbers, checkboxes, selects };
  }
  if (source && typeof source === 'object' && ('numberProps' in source || 'checkboxProps' in source || 'selectProps' in source)) {
    const shaped = source as { numberProps?: readonly SchemaProperty[]; checkboxProps?: readonly SchemaProperty[]; selectProps?: readonly SchemaProperty[] };
    return {
      numbers: [...(shaped.numberProps ?? [])],
      checkboxes: [...(shaped.checkboxProps ?? [])],
      selects: [...(shaped.selectProps ?? [])],
    };
  }
  const record = source as Record<string, SchemaProperty>;
  const numbers: SchemaProperty[] = [];
  const checkboxes: SchemaProperty[] = [];
  const selects: SchemaProperty[] = [];
  for (const prop of Object.values(record ?? {})) {
    if (prop.type === 'checkbox') checkboxes.push(prop);
    else if (prop.type === 'select' || prop.type === 'status') selects.push(prop);
    else if (prop.type === 'number' || prop.type === 'formula' || prop.type === 'rollup') numbers.push(prop);
  }
  return { numbers, checkboxes, selects };
}

export function statEntries(source: PropertySource): StatEntry[] {
  const { numbers, checkboxes, selects } = asArray(source);
  const entries: StatEntry[] = [
    { label: 'Count of records', stat: { fn: 'count' } },
    ...checkboxes.map((prop): StatEntry => ({
      label: `Count where ${prop.name} is checked`,
      stat: { fn: 'count', where: [{ id: `f-${prop.id}`, propertyId: prop.id, operator: 'is_checked', value: true }] },
    })),
    ...selects.map((prop): StatEntry => ({
      label: `Distinct ${prop.name}`,
      stat: { fn: 'distinct', propertyId: prop.id },
    })),
    ...numbers.flatMap((prop): StatEntry[] => ([
      { label: `Sum of ${prop.name}`, stat: { fn: 'sum', propertyId: prop.id } },
      { label: `Average ${prop.name}`, stat: { fn: 'avg', propertyId: prop.id } },
      { label: `Min of ${prop.name}`, stat: { fn: 'min', propertyId: prop.id } },
      { label: `Max of ${prop.name}`, stat: { fn: 'max', propertyId: prop.id } },
    ])),
  ];
  return entries;
}

export const buildStatEntries = statEntries;
export const dashboardStatEntries = statEntries;
export const widgetStatEntries = statEntries;
export const statWidgetEntries = statEntries;
export const showAsEntries = statEntries;
export const kpiEntries = statEntries;
