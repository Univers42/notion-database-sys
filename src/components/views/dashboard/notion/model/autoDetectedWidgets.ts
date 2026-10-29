/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   autoDetectedWidgets.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { DashboardWidget, SchemaProperty } from '../../../../../types/database';

/** Zero-config dashboard as legacy widgets, derived from a database's schema. */
export function autoDetectedWidgets(properties: Record<string, SchemaProperty>): DashboardWidget[] {
  const props = Object.values(properties);
  const checkbox = props.find(p => p.type === 'checkbox');
  const number = props.find(p => p.type === 'number');
  const select = props.find(p => p.type === 'select' || p.type === 'status');

  const widgets: DashboardWidget[] = [
    { id: 'ad-total', type: 'stat', title: 'Total Records', aggregation: 'count', width: 1, height: 1 },
  ];
  if (checkbox) {
    widgets.push({ id: 'ad-checked', type: 'stat', title: checkbox.name, propertyId: checkbox.id, aggregation: 'count', width: 1, height: 1 });
  }
  if (number) {
    widgets.push({ id: 'ad-sum', type: 'stat', title: `Total ${number.name}`, propertyId: number.id, aggregation: 'sum', width: 1, height: 1 });
  }
  if (select) {
    widgets.push({ id: 'ad-distinct', type: 'stat', title: select.name, propertyId: select.id, aggregation: 'sum', width: 1, height: 1 });
    widgets.push({ id: 'ad-chart', type: 'chart', title: `By ${select.name}`, propertyId: select.id, chartStyle: 'bar', aggregation: 'count', width: 4, height: 1 });
  }
  widgets.push({ id: 'ad-recent', type: 'list', title: 'Recent Activity', width: 2, height: 2 });
  return widgets;
}
