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
import { cityCentroid } from './cityCentroids';
import { countryCentroid } from './countryCentroids';
import { enumOptions } from './liveSchemaMapper';
import {
  isAddressColumn,
  isCityColumn,
  isLatColumn,
  isLngColumn,
  isPlaceNameColumn,
} from './placeColumns';
import { toNumberValue } from './liveValueCodec';
import type { LiveMountRef } from './liveTypes';

/** Derived map property id (never a real column; encode skips type 'place'). */
export const LIVE_PLACE_PROPERTY_ID = '__place';

/** Above this many distinct values a text column is NOT select-like. */
const MAX_SYNTHESIZED_OPTIONS = 32;

/** Columns feeding the derived place property of a table: a precise lat/lng
 *  pair, or a `city`/`country` column resolved to a centroid (offline). */
export interface LivePlaceSource {
  lat?: string;
  lng?: string;
  /** City-name column → centroid when no lat/lng exist. */
  city?: string;
  /** Country name/ISO column → centroid (city fallback / standalone). */
  country?: string;
  /** Optional marker-label column. */
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

/** Auto-detect the DERIVED place source: a lat/lng PAIR (two columns with no
 *  single place-named column to type as `place`). City/country/region columns
 *  are typed as `place` themselves (see applyLivePresetProperties), so they are
 *  not collected here. Null without a coordinate pair. Pure. */
export function detectPlaceSource(columnNames: Iterable<string>): LivePlaceSource | null {
  const names = [...columnNames];
  const lat = names.find(isLatColumn);
  const lng = names.find(isLngColumn);
  if (!lat || !lng) return null;
  const label = names.find(isAddressColumn) ?? names.find(isCityColumn);
  return label ? { lat, lng, address: label } : { lat, lng };
}

/** The place source for a table: a registered preset wins, else auto-detection. */
export function resolveLivePlaceSource(
  ref: LiveMountRef,
  columnNames: Iterable<string>,
): LivePlaceSource | null {
  return resolveLiveTablePreset(ref)?.place ?? detectPlaceSource(columnNames);
}

/** Whether a place source's columns are present (so the derived __place is real). */
function placeSourceResolvable(source: LivePlaceSource, has: (name: string) => boolean): boolean {
  if (source.lat && source.lng) return has(source.lat) && has(source.lng);
  if (source.city) return has(source.city);
  if (source.country) return has(source.country);
  return false;
}

/** Upgrade one text column to `select` from its observed values (in place,
 *  no-op when not text / too high cardinality). Option id === raw value, so the
 *  write path still sends the plain string — display-only, engine-safe. */
function synthesizeSelect(
  properties: Record<string, SchemaProperty>,
  column: string,
  rows: Record<string, unknown>[],
): void {
  const property = properties[column];
  if (!property || property.type !== 'text') return;
  const seen: string[] = [];
  for (const row of rows) {
    const raw = row[column];
    if (typeof raw === 'string' && raw !== '' && !seen.includes(raw)) seen.push(raw);
  }
  if (seen.length === 0 || seen.length > MAX_SYNTHESIZED_OPTIONS) return;
  seen.sort((a, b) => a.localeCompare(b)); // deterministic across reloads
  properties[column] = { ...property, type: 'select', options: enumOptions(seen) };
}

/** Apply the table's presentation to a mapped property set (in place): preset
 *  select upgrades, then retype place-name columns (city/country/region/…) to
 *  the `place` LOCATION attribute, then add a derived read-only `place` for a
 *  lat/lng pair (the only place-source with no single column to type). */
export function applyLivePresetProperties(
  properties: Record<string, SchemaProperty>,
  ref: LiveMountRef,
  rows: Record<string, unknown>[],
): Record<string, SchemaProperty> {
  const preset = resolveLiveTablePreset(ref);
  for (const column of preset?.selectColumns ?? []) synthesizeSelect(properties, column, rows);
  // A column whose VALUE is a place name → a `place` (location) attribute, not a
  // category. Skip FK/relation columns (e.g. `location_id`) and the derived id.
  for (const name of Object.keys(properties)) {
    if (name === LIVE_PLACE_PROPERTY_ID) continue;
    const property = properties[name];
    if ((property.type === 'text' || property.type === 'select') && isPlaceNameColumn(name)) {
      properties[name] = { ...property, type: 'place' }; // place ignores any leftover options
    }
  }
  const placeSource = resolveLivePlaceSource(ref, Object.keys(properties));
  if (placeSource && placeSourceResolvable(placeSource, (name) => Boolean(properties[name]))) {
    properties[LIVE_PLACE_PROPERTY_ID] = { id: LIVE_PLACE_PROPERTY_ID, name: 'Location', type: 'place' };
  }
  return properties;
}

/** Derived place value `{lat, lng, address}` for one row (null when the
 *  table has no place source or the row lacks finite coordinates). */
export function decodeLivePlaceValue(
  row: Record<string, unknown>,
  ref: LiveMountRef,
): { lat: number; lng: number; address: string } | null {
  const place = resolveLivePlaceSource(ref, Object.keys(row));
  if (!place) return null;
  if (place.lat && place.lng) {
    const lat = toNumberValue(row[place.lat]); // null/'' are MISSING, not 0
    const lng = toNumberValue(row[place.lng]);
    if (lat === null || lng === null) return null;
    const raw = place.address ? row[place.address] : '';
    return { lat, lng, address: typeof raw === 'string' ? raw : '' };
  }
  if (place.city) {
    // city name → centroid; unknown city falls back to the country centroid.
    const centroid = cityCentroid(row[place.city])
      ?? (place.country ? countryCentroid(row[place.country]) : null);
    if (!centroid) return null;
    return { lat: centroid[0], lng: centroid[1], address: placeLabel(row, place, place.city) };
  }
  if (place.country) {
    const centroid = countryCentroid(row[place.country]); // offline name/ISO → centroid
    if (!centroid) return null;
    return { lat: centroid[0], lng: centroid[1], address: placeLabel(row, place, place.country) };
  }
  return null;
}

/** The marker label: the address column when set, else the source column. */
function placeLabel(row: Record<string, unknown>, place: LivePlaceSource, fallbackColumn: string): string {
  const column = place.address ?? fallbackColumn;
  const value = row[column];
  return typeof value === 'string' ? value : '';
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
