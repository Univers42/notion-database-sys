/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   placeColumns.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Column-name → place-kind classification + offline geocoding, shared by the
 * schema presenter (which retypes these columns to `place`) and the value codec
 * (which geocodes their value). Lives in its own module — depending only on the
 * centroid tables — so neither liveValueCodec nor liveViewPresets imports the
 * other (no cycle). A city/country/region name resolves to a centroid; a free
 * address resolves to no coordinates (a location label without a marker). Pure.
 */

import { cityCentroid, cityCentroidFromText } from './cityCentroids';
import { countryCentroid } from './countryCentroids';
import { regionCentroid } from './regionCentroids';

const CITY_NAMES = new Set(['city', 'town', 'municipality', 'locality']);
const COUNTRY_NAMES = new Set(['country', 'country_code', 'countrycode', 'country_name', 'nation']);
// `state` is excluded on purpose — too often an order/record STATUS, not a place.
const REGION_NAMES = new Set(['region', 'province', 'continent', 'subregion']);
const GENERIC_NAMES = new Set(['location', 'place']);
const ADDRESS_NAMES = new Set(['address', 'street', 'formatted_address', 'full_address']);

export function isLatColumn(name: string): boolean {
  const n = name.toLowerCase();
  return n === 'lat' || n === 'latitude' || n === 'geolat' || n.endsWith('_lat') || n.endsWith('_latitude');
}
export function isLngColumn(name: string): boolean {
  const n = name.toLowerCase();
  return ['lng', 'lon', 'long', 'longitude', 'geolng', 'geolon'].includes(n)
    || n.endsWith('_lng') || n.endsWith('_lon') || n.endsWith('_long') || n.endsWith('_longitude');
}
export function isAddressColumn(name: string): boolean {
  const n = name.toLowerCase();
  return ADDRESS_NAMES.has(n) || n.endsWith('_address');
}
export function isCityColumn(name: string): boolean {
  const n = name.toLowerCase();
  return CITY_NAMES.has(n) || n.endsWith('_city') || n.endsWith('_town');
}
export function isCountryColumn(name: string): boolean {
  const n = name.toLowerCase();
  return COUNTRY_NAMES.has(n) || n.endsWith('_country');
}
export function isRegionColumn(name: string): boolean {
  const n = name.toLowerCase();
  return REGION_NAMES.has(n) || n.endsWith('_region') || n.endsWith('_province');
}

/** A column whose VALUE is a place name → presented as a `place` (location)
 *  attribute. Coordinate columns (lat/lng) drive the derived place instead. */
export function isPlaceNameColumn(name: string): boolean {
  const n = name.toLowerCase();
  return isCityColumn(name) || isCountryColumn(name) || isRegionColumn(name)
    || isAddressColumn(name) || GENERIC_NAMES.has(n) || n.endsWith('_location');
}

/** Geocode a place-named column's value to [lat, lng], or null. City names try
 *  the city table then country; an address is scanned for a known city it may
 *  contain ("…, Geneva, CH"); a street with no recognizable place stays
 *  markerless (a location label, honestly). */
export function geocodePlaceColumn(name: string, value: unknown): [number, number] | null {
  if (isCountryColumn(name)) return countryCentroid(value);
  if (isRegionColumn(name)) return regionCentroid(value);
  if (isAddressColumn(name)) return cityCentroidFromText(value) ?? countryCentroid(value);
  return cityCentroid(value) ?? cityCentroidFromText(value) ?? countryCentroid(value); // city / generic
}
