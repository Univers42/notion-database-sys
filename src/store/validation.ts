/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   validation.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 18:45:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { SchemaProperty, Page } from '../types/database';
import { safeString } from '../utils/safeString';
import { ok, fail } from './validation-result';
import { validateNumber, validateCheckbox, validateDate } from './validation-primitives';
import { validateSelect, validateMultiSelect, validateRelation } from './validation-schema';

export type { ValidationResult } from './validation-result';

/** System-managed properties — never overwritten by user edits. */
const SYSTEM_TYPES = new Set([
  'created_time', 'last_edited_time', 'created_by', 'last_edited_by',
]);

/** Computed properties — not directly settable. */
const COMPUTED_TYPES = new Set(['formula', 'rollup']);

/** Read-only properties — auto-generated. */
const READONLY_TYPES = new Set(['id']);

/**
 * Validate and coerce a property value to match its schema type.
 *
 * @param raw       The raw value from the user / editor
 * @param property  The schema property definition
 * @param allPages  All pages (needed to validate relation references)
 */
export function validatePropertyValue(
  raw: unknown,
  property: SchemaProperty,
  allPages?: Record<string, Page>,
): import('./validation-result').ValidationResult {
  const { type } = property;

  // Null / empty always accepted (clears the field)
  if (raw === null || raw === undefined || raw === '') {
    return ok(null);
  }

  if (SYSTEM_TYPES.has(type)) {
    return fail(`"${type}" is system-managed and cannot be edited`);
  }
  if (COMPUTED_TYPES.has(type)) {
    return fail(`"${type}" is computed — edit the configuration instead`);
  }
  if (READONLY_TYPES.has(type)) {
    return fail(`"${type}" is auto-generated and read-only`);
  }

  switch (type) {
    case 'title':
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
    case 'person':
    case 'user':
    case 'assigned_to':
      return ok(safeString(raw));

    case 'number': return validateNumber(raw);

    case 'checkbox': return validateCheckbox(raw);

    case 'date':
    case 'due_date': return validateDate(raw);

    case 'select':
    case 'status': return validateSelect(raw, property);

    case 'multi_select': return validateMultiSelect(raw, property);

    case 'relation': return validateRelation(raw, property, allPages);

    case 'files_media':
      return Array.isArray(raw) ? ok(raw) : ok([raw]);

    case 'place':
      return typeof raw === 'object' ? ok(raw) : ok(safeString(raw));

    case 'button': return ok(null);

    case 'custom': return ok(raw);

    default: return ok(raw);
  }
}
