/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   lockGuards.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Pure lock predicates. Two scopes, Notion-style:
 * - database lock (`DatabaseSchema.locked`): schema edits, adding views and
 *   layout customization are disabled everywhere the database appears;
 * - view lock (`ViewSettings.locked`): that view's configuration is frozen.
 * Locks are honesty about INTENT, not security — data stays readable and
 * cell values stay editable.
 */

import type { DatabaseSchema, ViewConfig } from '../component/types';

export function isDatabaseLocked(database: DatabaseSchema | null | undefined): boolean {
  return Boolean(database?.locked);
}

export function isViewLocked(
  view: ViewConfig | null | undefined,
  database?: DatabaseSchema | null,
): boolean {
  return Boolean(view?.settings?.locked) || isDatabaseLocked(database);
}
