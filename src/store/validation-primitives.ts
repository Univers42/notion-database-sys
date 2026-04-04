/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   validation-primitives.ts                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 18:45:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { safeString } from '../utils/safeString';
import type { ValidationResult } from './validation-result';
import { ok, fail } from './validation-result';

export function validateNumber(raw: unknown): ValidationResult {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? ok(raw) : fail('Number must be finite');
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return ok(null);
    const n = Number(trimmed);
    return Number.isFinite(n) ? ok(n) : fail(`"${trimmed}" is not a valid number`);
  }
  if (typeof raw === 'boolean') return ok(raw ? 1 : 0);
  return fail(`Expected a number, got ${typeof raw}`);
}

export function validateCheckbox(raw: unknown): ValidationResult {
  if (typeof raw === 'boolean') return ok(raw);
  if (raw === 1 || raw === '1' || raw === 'true') return ok(true);
  if (raw === 0 || raw === '0' || raw === 'false') return ok(false);
  return fail(`Expected a boolean, got "${safeString(raw)}"`);
}

export function validateDate(raw: unknown): ValidationResult {
  if (typeof raw !== 'string') return fail(`Expected a date string, got ${typeof raw}`);
  // Accept ISO 8601 strings and YYYY-MM-DD
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return fail(`"${raw}" is not a valid date`);
  return ok(raw); // keep the original string format
}
