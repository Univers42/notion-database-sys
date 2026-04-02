/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   resolver.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:04:29 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:04:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { PermissionLevel } from '@notion-db/types';

/** Ordered from least to most access — index = numeric level */
export const PERMISSION_HIERARCHY: PermissionLevel[] = [
  'no_access',
  'can_view',
  'can_comment',
  'can_edit',
  'full_access',
];

/** Get numeric level for a permission string */
export function permissionLevel(p: PermissionLevel): number {
  return PERMISSION_HIERARCHY.indexOf(p);
}

/** Compare two permission levels. Returns the higher one. */
export function maxPermission(a: PermissionLevel, b: PermissionLevel): PermissionLevel {
  return permissionLevel(a) >= permissionLevel(b) ? a : b;
}

/** Check if `actual` meets the `required` level */
export function meetsRequirement(actual: PermissionLevel, required: PermissionLevel): boolean {
  return permissionLevel(actual) >= permissionLevel(required);
}

/**
 * Resolve effective permission from a stack of rules (workspace → page → block).
 * Later (more specific) rules override earlier ones. Explicit rules always win.
 *
 * @param rules — ordered from least specific (workspace) to most specific (block)
 */
export function resolvePermission(
  rules: Array<{ permission: PermissionLevel; explicit: boolean }>,
): PermissionLevel {
  if (rules.length === 0) return 'no_access';

  let effective: PermissionLevel = 'no_access';

  for (const rule of rules) {
    if (rule.explicit) {
      // Explicit rules override everything seen so far
      effective = rule.permission;
    } else {
      // Inherited: take the higher of current effective and this rule
      effective = maxPermission(effective, rule.permission);
    }
  }

  return effective;
}
