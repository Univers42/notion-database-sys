/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   docFilter.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Document, Filter, Sort } from 'mongodb';
import type { DocFilter, PageQuery } from '@notion-db/contract-types';

/** Compiles a DocFilter into a MongoDB filter. */
export function compileDocFilter(
  filter: DocFilter = {},
  fieldMap: Record<string, string> = {},
): Filter<Document> {
  const mongoFilter: Filter<Document> = {};

  for (const [propertyId, operators] of Object.entries(filter)) {
    const path = fieldMap[propertyId] ?? `properties.${propertyId}`;
    const compiled = compileOperators(operators);
    if (isEmptyOperatorObject(compiled)) continue;
    mongoFilter[path] = compiled;
  }

  return mongoFilter;
}

/** Compiles PageQuery.sort into MongoDB sort syntax. */
export function compileSort(
  sort: PageQuery['sort'] = [],
  fieldMap: Record<string, string> = {},
): Sort {
  const mongoSort: Record<string, 1 | -1> = {};
  for (const item of sort) {
    const path = fieldMap[item.propertyId] ?? `properties.${item.propertyId}`;
    mongoSort[path] = item.direction === 'asc' ? 1 : -1;
  }
  return mongoSort;
}

function compileOperators(operators: DocFilter[string]): Record<string, unknown> | unknown {
  const compiled: Record<string, unknown> = {};

  for (const [operator, value] of Object.entries(operators)) {
    switch (operator) {
      case 'eq': return value;
      case 'neq': compiled.$ne = value; break;
      case 'in': compiled.$in = value; break;
      case 'nin': compiled.$nin = value; break;
      case 'contains': compiled.$regex = escapeRegex(String(value)); compiled.$options = 'i'; break;
      case 'gt': compiled.$gt = value; break;
      case 'gte': compiled.$gte = value; break;
      case 'lt': compiled.$lt = value; break;
      case 'lte': compiled.$lte = value; break;
      case 'exists': compiled.$exists = Boolean(value); break;
      default: break;
    }
  }

  return compiled;
}

function escapeRegex(input: string): string {
  return input.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isEmptyOperatorObject(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && Object.keys(value).length === 0);
}
