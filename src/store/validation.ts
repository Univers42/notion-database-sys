/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   validation.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 18:45:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 00:41:44 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Property Value Validation & Coercion ────────────────────────────────────
// Ensures values conform to their property type before persisting.
// Returns the coerced value (or the original if already valid).
// Returns `undefined` when the value is fundamentally incompatible.

import type { SchemaProperty, Page } from '../types/database';

/** System-managed properties — never overwritten by user edits. */
const SYSTEM_TYPES = new Set([
  'created_time', 'last_edited_time', 'created_by', 'last_edited_by',
]);

/** Computed properties — not directly settable. */
const COMPUTED_TYPES = new Set(['formula', 'rollup']);

/** Read-only properties — auto-generated. */
const READONLY_TYPES = new Set(['id']);

export interface ValidationResult {
  /** Whether the value passed validation (possibly after coercion). */
  ok: boolean;
  /** The coerced/cleaned value to store. Only meaningful when `ok` is true. */
  value: unknown;
  /** Human-readable reason when `ok` is false. */
  reason?: string;
}

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
): ValidationResult {
  const { type } = property;

  // ── Null / empty always accepted (clears the field) ──
  if (raw === null || raw === undefined || raw === '') {
    return ok(null);
  }

  // ── System / computed / readonly — reject user edits ──
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
    // ── Text-like ──
    case 'title':
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
    case 'person':
    case 'user':
    case 'assigned_to':
      return ok(String(raw));

    // ── Number ──
    case 'number': return validateNumber(raw);

    // ── Checkbox ──
    case 'checkbox': return validateCheckbox(raw);

    // ── Date / Due date ──
    case 'date':
    case 'due_date': return validateDate(raw);

    // ── Select / Status (single option ID) ──
    case 'select':
    case 'status': return validateSelect(raw, property);

    // ── Multi-select (array of option IDs) ──
    case 'multi_select': return validateMultiSelect(raw, property);

    // ── Relation (array of page IDs) ──
    case 'relation': return validateRelation(raw, property, allPages);

    // ── Files / Media ──
    case 'files_media':
      return Array.isArray(raw) ? ok(raw) : ok([raw]);

    // ── Place (object with lat/lng/address) ──
    case 'place':
      return typeof raw === 'object' ? ok(raw) : ok(String(raw));

    // ── Button (no value) ──
    case 'button': return ok(null);

    // ── Custom ──
    case 'custom': return ok(raw);

    default: return ok(raw);
  }
}

// ─── Type-specific validators ────────────────────────────────────────────────

function validateNumber(raw: unknown): ValidationResult {
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

function validateCheckbox(raw: unknown): ValidationResult {
  if (typeof raw === 'boolean') return ok(raw);
  if (raw === 1 || raw === '1' || raw === 'true') return ok(true);
  if (raw === 0 || raw === '0' || raw === 'false') return ok(false);
  return fail(`Expected a boolean, got "${raw}"`);
}

function validateDate(raw: unknown): ValidationResult {
  if (typeof raw !== 'string') return fail(`Expected a date string, got ${typeof raw}`);
  // Accept ISO 8601 strings and YYYY-MM-DD
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return fail(`"${raw}" is not a valid date`);
  return ok(raw); // keep the original string format
}

function validateSelect(raw: unknown, property: SchemaProperty): ValidationResult {
  const optionId = String(raw);
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

function validateMultiSelect(raw: unknown, property: SchemaProperty): ValidationResult {
  // Coerce single value to array
  const ids: unknown[] = Array.isArray(raw) ? raw : [raw];
  const options = property.options ?? [];

  // If no options defined yet, accept anything
  if (options.length === 0) return ok(ids.map(String));

  const resolved: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const s = String(id);
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

function validateRelation(
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok(value: unknown): ValidationResult {
  return { ok: true, value };
}

function fail(reason: string): ValidationResult {
  return { ok: false, value: undefined, reason };
}
