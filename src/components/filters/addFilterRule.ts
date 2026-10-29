/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   addFilterRule.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { DatabaseStoreApi } from '../../store/useDatabaseStore';
import type { SchemaProperty } from '../../types/database';
import { getOperatorsForType } from './constants';

/** Adds an empty rule on `property` with its type's first operator and
 *  returns the new rule's id, so the caller can open its editor at once. */
export function addFilterRule(storeApi: DatabaseStoreApi, viewId: string, property: SchemaProperty | undefined): string | undefined {
  if (!property) return undefined;
  const store = storeApi.getState();
  store.addFilter(viewId, { propertyId: property.id, operator: getOperatorsForType(property.type)[0].value, value: '' });
  return storeApi.getState().views[viewId]?.filters.at(-1)?.id;
}
