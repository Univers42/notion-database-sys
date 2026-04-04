/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   validation-schema.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 18:45:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { SchemaProperty, Page } from '../types/database';
import { safeString } from '../utils/safeString';
import type { ValidationResult } from './validation-result';
import { ok, fail } from './validation-result';

export function validateSelect(raw: unknown, property: SchemaProperty): ValidationResult {
  const optionId = safeString(raw);
  const options = property.options ?? [];

  // If no options defined yet, accept any string (schema will be expanded)
  if (options.length === 0) return ok(optionId);

  // Check the value is a known option ID
  const match = options.find(o => o.id === optionId);
  if (match) return ok(optionId);

  // Fallback: maybe the user passed the option *value* (display name) instead of its ID
  const byValue = options.find(o =>
    o.value.toLowerCase() === optionId.toLowerCase(),
  );
  if (byValue) return ok(byValue.id);

  return fail(
    `"${optionId}" is not a valid option. ` +
    `Valid: ${options.map(o => o.value).join(', ')}`,
  );
}

export function validateMultiSelect(raw: unknown, property: SchemaProperty): ValidationResult {
  // Coerce single value to array
  const ids: unknown[] = Array.isArray(raw) ? raw : [raw];
  const options = property.options ?? [];

  // If no options defined yet, accept anything
  if (options.length === 0) return ok(ids.map(String));

  const resolved: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const s = safeString(id);
    let resolvedId: string | undefined;

    const match = options.find(o => o.id === s);
    if (match) { resolvedId = s; }

    if (!resolvedId) {
      // Fallback: match by display value
      const byValue = options.find(o =>
        o.value.toLowerCase() === s.toLowerCase(),
      );
      if (byValue) { resolvedId = byValue.id; }
    }

    if (!resolvedId) {
      return fail(
        `"${s}" is not a valid multi-select option. ` +
        `Valid: ${options.map(o => o.value).join(', ')}`,
      );
    }

    // Deduplicate: skip if already resolved to this ID
    if (!seen.has(resolvedId)) {
      seen.add(resolvedId);
      resolved.push(resolvedId);
    }
  }
  return ok(resolved);
}

export function validateRelation(
  raw: unknown,
  property: SchemaProperty,
  allPages?: Record<string, Page>,
): ValidationResult {
  // Coerce single value to array
  const ids: unknown[] = Array.isArray(raw) ? raw : [raw];
  const pageIds = ids.map(String);

  // If no relation config, accept any array of strings
  if (!property.relationConfig?.databaseId) return ok(pageIds);

  // If we have all pages, validate each reference exists in the target DB
  if (allPages) {
    const targetDbId = property.relationConfig.databaseId;
    for (const pid of pageIds) {
      const target = allPages[pid];
      if (!target) {
        return fail(`Related page "${pid}" does not exist`);
      }
      if (target.databaseId !== targetDbId) {
        return fail(
          `Page "${pid}" belongs to a different database — ` +
          `expected target DB "${targetDbId}"`,
        );
      }
    }
  }
  return ok(pageIds);
}
