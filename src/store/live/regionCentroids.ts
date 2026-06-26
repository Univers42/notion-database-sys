/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   regionCentroids.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Offline business/geographic region → coarse centroid, so a `region` column
 * (APAC / EU / LATAM …) plots a (coarse) marker on the MapView. Keyed by
 * lowercased name/abbreviation. Coordinates are deliberately rough — a region
 * is an area, not a point.
 */

/** [lat, lng, ...lowercased aliases]. */
const REGIONS: [number, number, ...string[]][] = [
  [12, 115, 'apac', 'asia pacific', 'asia-pacific', 'asiapacific'],
  [50, 10, 'eu', 'europe', 'eur'],
  [25, 25, 'emea'],
  [-15, -60, 'latam', 'latin america', 'south america', 'sa'],
  [45, -100, 'na', 'namer', 'north america', 'nam'],
  [5, -75, 'amer', 'americas'],
  [29, 45, 'mea', 'middle east', 'middle-east'],
  [34, 100, 'asia', 'apj'],
  [2, 20, 'africa', 'afr'],
  [-25, 140, 'oceania', 'anz', 'australia'],
  [15, -90, 'central america', 'camer'],
  [20, -77, 'caribbean'],
];

const REGION_CENTROIDS = new Map<string, [number, number]>();
for (const [lat, lng, ...aliases] of REGIONS) {
  for (const alias of aliases) REGION_CENTROIDS.set(alias, [lat, lng]);
}

/** Coarse [lat, lng] for a region name/abbreviation, or null when unknown. */
export function regionCentroid(value: unknown): [number, number] | null {
  if (typeof value !== 'string') return null;
  return REGION_CENTROIDS.get(value.trim().toLowerCase()) ?? null;
}
