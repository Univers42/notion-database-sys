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
 * cell values stay editable, a new option picked in a select cell included.
 * A host that sets `locksManagedByHost` owns both
 * locks; `changeRespectsLocks` is the store's one check of all of the above.
 */

import type { DatabaseSchema, ViewConfig } from '../component/types';

type LockedState = { databases: Record<string, DatabaseSchema>; views: Record<string, ViewConfig> };

export function isDatabaseLocked(database: DatabaseSchema | null | undefined): boolean {
  return Boolean(database?.locked);
}

export function isViewLocked(
  view: ViewConfig | null | undefined,
  database?: DatabaseSchema | null,
): boolean {
  return Boolean(view?.settings?.locked) || isDatabaseLocked(database);
}

export function areLocksManagedByHost(database: DatabaseSchema | null | undefined): boolean {
  return Boolean(database?.locksManagedByHost);
}

const viewLockOf = (view: ViewConfig | undefined): boolean => Boolean(view?.settings?.locked);

/**
 * False when a store change would edit, delete or re-lock a locked view, add a
 * view to or edit a locked database (schema, tabs order, automations), or flip
 * a lock the host manages. Saving automations still fails on a locked view
 * that holds legacy view-level automations: the save moves them off the view. Untouched records keep their reference, so the check
 * is O(views + databases) reference compares.
 */
export function changeRespectsLocks(state: LockedState, patch: Partial<LockedState>): boolean {
  // The lock toggles themselves write through updateDatabaseMeta, not the slices.
  if (patch.databases) {
    for (const [id, before] of Object.entries(state.databases)) {
      const after = patch.databases[id];
      if (after !== before && isDatabaseLocked(before) && !appendsOptionOnly(before, after)) return false;
    }
  }
  if (!patch.views) return true;
  for (const [id, before] of Object.entries(state.views)) {
    const after = patch.views[id];
    if (after === before) continue;
    const database = state.databases[before.databaseId];
    const allowed = after && !isDatabaseLocked(database)
      && (unlocksOnly(before, after) || followsSchema(before, after, database, patch.databases?.[before.databaseId]));
    if (isViewLocked(before, database) && !allowed) return false;
    if (after && areLocksManagedByHost(database) && viewLockOf(after) !== viewLockOf(before)) return false;
  }
  for (const [id, after] of Object.entries(patch.views)) {
    if (!(id in state.views) && isDatabaseLocked(state.databases[after.databaseId])) return false;
  }
  return true;
}

/** True when a locked view's only change is following a property added or
 *  deleted in the same write — the new column shown, the deleted one gone —
 *  so a locked view never blocks schema edits made from another view. */
function followsSchema(before: ViewConfig, after: ViewConfig, was: DatabaseSchema | undefined, now: DatabaseSchema | undefined): boolean {
  if (!was || !now || was === now) return false;
  if (JSON.stringify({ ...after, visibleProperties: before.visibleProperties }) !== JSON.stringify(before)) return false;
  const kept = new Set(before.visibleProperties);
  const shown = new Set(after.visibleProperties);
  const added = after.visibleProperties.filter(id => !kept.has(id));
  const removed = before.visibleProperties.filter(id => !shown.has(id));
  return added.every(id => !(id in was.properties) && id in now.properties)
    && removed.every(id => !(id in now.properties))
    && JSON.stringify(after.visibleProperties.filter(id => kept.has(id))) === JSON.stringify(before.visibleProperties.filter(id => shown.has(id)));
}

/** True when `after` differs from a locked `before` only by turning its lock off. */
function unlocksOnly(before: ViewConfig, after: ViewConfig): boolean {
  if (viewLockOf(after)) return false;
  const settings = { ...after.settings, locked: before.settings?.locked };
  return JSON.stringify({ ...after, settings }) === JSON.stringify(before);
}

/** True when `after` differs from a locked `before` only by options appended to
 *  one select property — what picking a new tag in a cell writes. */
function appendsOptionOnly(before: DatabaseSchema, after: DatabaseSchema | undefined): boolean {
  if (!after) return false;
  const { properties: was, ...beforeRest } = before;
  const { properties: now, ...afterRest } = after;
  if (JSON.stringify(afterRest) !== JSON.stringify(beforeRest)) return false;
  const ids = Object.keys(now);
  const changed = ids.filter(id => now[id] !== was[id]);
  if (ids.length !== Object.keys(was).length || changed.length !== 1 || !was[changed[0]]) return false;
  const { options: oldOptions = [], ...oldRest } = was[changed[0]];
  const { options: newOptions = [], ...newRest } = now[changed[0]];
  return newOptions.length > oldOptions.length
    && JSON.stringify(newRest) === JSON.stringify(oldRest)
    && JSON.stringify(newOptions.slice(0, oldOptions.length)) === JSON.stringify(oldOptions);
}
