/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveViewPresets.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Optional per-TABLE presentation presets for live mounts, registered by the
 * embedding app (see widgets/database-view/model/agencyViewPresets in osionos)
 * and consulted by liveStateBuilder. A preset can:
 * - upgrade plain text columns to `select` (options synthesized from the
 *   values observed in the loaded rows; option id === raw value, matching
 *   liveSchemaMapper's enum convention, so the write path still sends the
 *   plain string to the text column);
 * - declare a derived `place` property (LIVE_PLACE_PROPERTY_ID) sourced from
 *   lat/lng columns so MapView can plot rows — encodeLiveValue does not
 *   encode `place`, which keeps the derived property read-only on the wire;
 * - contribute curated default views (board/map/timeline/feed/gallery/…).
 * Everything degrades to the plain mapping when nothing is registered.
 */

import type { DatabaseSchema, SchemaProperty, ViewConfig } from '../../component/types';
import { enumOptions } from './liveSchemaMapper';
import { toNumberValue } from './liveValueCodec';
import type { LiveMountRef } from './liveTypes';

/** Derived map property id (never a real column; encode skips type 'place'). */
export const LIVE_PLACE_PROPERTY_ID = '__place';

/** Above this many distinct values a text column is NOT select-like. */
const MAX_SYNTHESIZED_OPTIONS = 32;

/** Columns feeding the derived place property of a table. */
export interface LivePlaceSource {
  lat: string;
  lng: string;
  address?: string;
}

/** Presentation preset for one mounted table. */
export interface LiveTablePreset {
  /** Text columns presented as select (options = observed row values). */
  selectColumns?: string[];
  /** Source columns of the derived `place` property (MapView support). */
  place?: LivePlaceSource;
  /** Curated default views appended after the built-in table view. */
  views?: (database: DatabaseSchema, ref: LiveMountRef) => ViewConfig[];
}

export type LiveTablePresetResolver = (ref: LiveMountRef) => LiveTablePreset | null;

const presetResolvers: LiveTablePresetResolver[] = [];

/** App-side registration. COMPOSABLE: each registered resolver is consulted
 *  in registration order and the first non-null preset wins, so independent
 *  preset packs (agency investigation + commerce demo + …) coexist without
 *  clobbering each other. Re-registering the same resolver is a no-op;
 *  `null` clears the registry (tests). */
export function registerLiveTablePresets(resolver: LiveTablePresetResolver | null): void {
  if (resolver === null) {
    presetResolvers.length = 0;
    return;
  }
  if (!presetResolvers.includes(resolver)) presetResolvers.push(resolver);
}

/** The preset for one mount table, or null (resolver errors degrade to null). */
export function resolveLiveTablePreset(ref: LiveMountRef): LiveTablePreset | null {
  for (const resolver of presetResolvers) {
    try {
      const preset = resolver(ref);
      if (preset) return preset;
    } catch {
      // a broken pack must not take the others down — fall through
    }
  }
  return null;
}

/** Apply the table's preset to a mapped property set (in place): select
 *  upgrades from observed rows + the derived place property when sourced. */
export function applyLivePresetProperties(
  properties: Record<string, SchemaProperty>,
  ref: LiveMountRef,
  rows: Record<string, unknown>[],
): Record<string, SchemaProperty> {
  const preset = resolveLiveTablePreset(ref);
  if (!preset) return properties;
  for (const column of preset.selectColumns ?? []) {
    const property = properties[column];
    if (!property || property.type !== 'text') continue;
    const seen: string[] = [];
    for (const row of rows) {
      const raw = row[column];
      if (typeof raw === 'string' && raw !== '' && !seen.includes(raw)) seen.push(raw);
    }
    if (seen.length === 0 || seen.length > MAX_SYNTHESIZED_OPTIONS) continue;
    seen.sort((a, b) => a.localeCompare(b)); // deterministic across reloads
    properties[column] = { ...property, type: 'select', options: enumOptions(seen) };
  }
  if (preset.place && properties[preset.place.lat] && properties[preset.place.lng]) {
    properties[LIVE_PLACE_PROPERTY_ID] = {
      id: LIVE_PLACE_PROPERTY_ID,
      name: 'Location',
      type: 'place',
    };
  }
  return properties;
}

/** Derived place value `{lat, lng, address}` for one row (null when the
 *  table has no place source or the row lacks finite coordinates). */
export function decodeLivePlaceValue(
  row: Record<string, unknown>,
  ref: LiveMountRef,
): { lat: number; lng: number; address: string } | null {
  const place = resolveLiveTablePreset(ref)?.place;
  if (!place) return null;
  const lat = toNumberValue(row[place.lat]); // null/'' are MISSING, not 0
  const lng = toNumberValue(row[place.lng]);
  if (lat === null || lng === null) return null;
  const raw = place.address ? row[place.address] : '';
  return { lat, lng, address: typeof raw === 'string' ? raw : '' };
}

/** Curated views for a live database ([] without a preset; errors degrade). */
export function buildLivePresetViews(database: DatabaseSchema, ref: LiveMountRef): ViewConfig[] {
  const preset = resolveLiveTablePreset(ref);
  if (!preset?.views) return [];
  try {
    return preset.views(database, ref);
  } catch {
    return [];
  }
}
