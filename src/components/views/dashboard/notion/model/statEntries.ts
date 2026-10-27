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

import type { DashboardStatConfig, SchemaProperty } from '../../../../../types/database';
import { numberProperties } from './dashboardViewOps';

export interface StatEntry {
  label: string;
  stat: DashboardStatConfig;
}

/** Every Number presentation a database's columns allow. The picker and the widget
 *  menu both list these, so a tile one of them builds the other can rebuild. */
export function statEntries(properties: Record<string, SchemaProperty> | readonly SchemaProperty[]): StatEntry[] {
  const all = Object.values(properties);
  const checkboxes = all.filter(p => p.type === 'checkbox');
  const selects = all.filter(p => p.type === 'select' || p.type === 'status');
  return [
    { label: 'Count of records', stat: { fn: 'count' } },
    ...checkboxes.flatMap((prop): StatEntry[] => ([
      {
        label: `Count where ${prop.name} is checked`,
        stat: { fn: 'count', where: [{ id: `f-${prop.id}`, propertyId: prop.id, operator: 'is_checked', value: true }] },
      },
      {
        label: `Count where ${prop.name} is not checked`,
        stat: { fn: 'count', where: [{ id: `f-${prop.id}`, propertyId: prop.id, operator: 'is_not_checked', value: true }] },
      },
    ])),
    ...selects.map((prop): StatEntry => ({ label: `Distinct ${prop.name}`, stat: { fn: 'distinct', propertyId: prop.id } })),
    ...numberProperties(all).flatMap((prop): StatEntry[] => ([
      { label: `Sum of ${prop.name}`, stat: { fn: 'sum', propertyId: prop.id } },
      { label: `Average ${prop.name}`, stat: { fn: 'avg', propertyId: prop.id } },
      { label: `Min of ${prop.name}`, stat: { fn: 'min', propertyId: prop.id } },
      { label: `Max of ${prop.name}`, stat: { fn: 'max', propertyId: prop.id } },
    ])),
  ];
}
