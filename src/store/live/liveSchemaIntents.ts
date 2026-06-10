/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveSchemaIntents.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Schema half of the persist diff → the DDL requests that are HONEST engine
 * changes, filtering everything that must never touch the engine:
 * - `prop-*` ids are UI-temp properties (databaseSlice) whose columns were
 *   never created server-side — dropping/retyping them is meaningless;
 * - `__*` ids are derived presentation properties (liveViewPresets `__place`)
 *   with no column behind them — any DDL on them is always wrong;
 * - text↔select retypes are the preset select-synthesis drifting with the
 *   observed rows (liveViewPresets upgrades text columns to select and back
 *   across the option threshold) — presentational, NEVER a user's ALTER. A
 *   real enum conversion stays available through add-column; silently turning
 *   a text column into an enum because the row sample changed would mutate
 *   the user's schema behind their back.
 * Pure (node:test without DOM); the caller enqueues `requests` and logs
 * `messages`.
 */

import { ddlAddColumnRequest, ddlDropColumnRequest, ddlRetypeRequest } from './liveDdlMapper';
import type { LiveStateDiff } from './liveStateDiff';

export interface LiveDdlIntents {
  requests: Record<string, unknown>[];
  /** Human-readable skip explanations (console-surfaced by the caller). */
  messages: string[];
}

/** UI-added properties get `prop-<hex>` ids; mapper ids are raw column names. */
function isUiTempPropertyId(propertyId: string): boolean {
  return propertyId.startsWith('prop-');
}

/** Derived presentation properties (`__place`, any future `__*`). */
function isDerivedPropertyId(propertyId: string): boolean {
  return propertyId.startsWith('__');
}

/** Preset select-synthesis flips text↔select without any engine change. */
function isPresentationalRetype(fromType: string, newType: string): boolean {
  return (fromType === 'text' && newType === 'select')
    || (fromType === 'select' && newType === 'text');
}

/** The diff's schema intents → honest DDL requests + skip explanations. */
export function collectLiveDdlIntents(diff: LiveStateDiff, table: string): LiveDdlIntents {
  const out: LiveDdlIntents = { requests: [], messages: [] };
  for (const property of diff.schemaAdds) {
    if (isDerivedPropertyId(property.id)) continue; // presentation-only, no column
    const { request, skipped } = ddlAddColumnRequest(table, property);
    if (request) out.requests.push(request);
    if (skipped) out.messages.push(`schema change skipped: ${skipped}`);
  }
  for (const propertyId of diff.schemaRemoves) {
    if (isUiTempPropertyId(propertyId) || isDerivedPropertyId(propertyId)) continue;
    out.requests.push(ddlDropColumnRequest(table, propertyId));
  }
  for (const retype of diff.schemaRetypes) {
    if (isUiTempPropertyId(retype.propertyId) || isDerivedPropertyId(retype.propertyId)) continue;
    if (isPresentationalRetype(retype.fromType, retype.newType)) {
      out.messages.push(`"${retype.propertyId}" text↔select is presentation-only (no engine ALTER)`);
      continue;
    }
    const { request, skipped } = ddlRetypeRequest(table, retype.property);
    if (request) out.requests.push(request);
    if (skipped) out.messages.push(`schema change skipped: ${skipped}`);
  }
  return out;
}
