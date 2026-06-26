/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   cityCentroids.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Offline city → approximate centroid (lat, lng), so a plain `city` text/select
 * column plots on the MapView without a network geocoder. Keyed by lowercased
 * city name. Covers major world cities (+ every city in the demo datasets).
 *
 * ponytail: ~120 major cities — for an unknown city the decoder falls back to a
 *   `country` column's centroid (countryCentroids); extend this table or add a
 *   "city, country" key for finer / disambiguated coverage. Ambiguous names
 *   (e.g. "Paris") resolve to the major city.
 */

/** [lat, lng, lowercased name]. */
const CITIES: [number, number, string][] = [
  // — demo datasets (restaurant / commerce / agency locations) —
  [44.84, -0.58, 'bordeaux'], [50.63, 3.06, 'lille'], [43.3, 5.37, 'marseille'],
  [48.85, 2.35, 'paris'], [48.58, 7.75, 'strasbourg'], [52.37, 4.9, 'amsterdam'],
  [30.27, -97.74, 'austin'], [12.97, 77.59, 'bangalore'], [52.52, 13.4, 'berlin'],
  [4.71, -74.07, 'bogota'], [41.88, -87.63, 'chicago'], [39.74, -104.99, 'denver'],
  [-12.05, -77.04, 'lima'], [38.72, -9.14, 'lisbon'], [40.42, -3.7, 'madrid'],
  [-37.81, 144.96, 'melbourne'], [19.43, -99.13, 'mexico city'], [-34.9, -56.16, 'montevideo'],
  [45.5, -73.57, 'montreal'], [34.69, 135.5, 'osaka'], [50.08, 14.44, 'prague'],
  [-8.05, -34.88, 'recife'], [-33.45, -70.67, 'santiago'], [47.61, -122.33, 'seattle'],
  [37.57, 126.98, 'seoul'], [1.35, 103.82, 'singapore'], [25.03, 121.57, 'taipei'],
  [43.65, -79.38, 'toronto'], [51.22, 4.4, 'antwerp'], [25.2, 55.27, 'dubai'],
  [46.2, 6.14, 'geneva'], [53.55, 9.99, 'hamburg'], [8.98, -79.52, 'panama city'],
  [51.92, 4.48, 'rotterdam'], [35.9, 14.51, 'valletta'], [48.21, 16.37, 'vienna'],
  [47.38, 8.54, 'zurich'],
  // — other major world cities —
  [51.51, -0.13, 'london'], [40.71, -74.01, 'new york'], [35.68, 139.69, 'tokyo'],
  [34.05, -118.24, 'los angeles'], [37.77, -122.42, 'san francisco'], [-33.87, 151.21, 'sydney'],
  [39.9, 116.41, 'beijing'], [31.23, 121.47, 'shanghai'], [19.08, 72.88, 'mumbai'],
  [28.61, 77.21, 'delhi'], [-23.55, -46.63, 'sao paulo'], [-34.6, -58.38, 'buenos aires'],
  [41.9, 12.5, 'rome'], [45.46, 9.19, 'milan'], [41.39, 2.17, 'barcelona'],
  [48.14, 11.58, 'munich'], [50.11, 8.68, 'frankfurt'], [50.85, 4.35, 'brussels'],
  [55.68, 12.57, 'copenhagen'], [59.33, 18.07, 'stockholm'], [59.91, 10.75, 'oslo'],
  [60.17, 24.94, 'helsinki'], [52.23, 21.01, 'warsaw'], [37.98, 23.73, 'athens'],
  [41.01, 28.98, 'istanbul'], [55.76, 37.62, 'moscow'], [30.04, 31.24, 'cairo'],
  [-26.2, 28.05, 'johannesburg'], [-1.29, 36.82, 'nairobi'], [6.52, 3.38, 'lagos'],
  [53.35, -6.26, 'dublin'], [53.48, -2.24, 'manchester'], [55.95, -3.19, 'edinburgh'],
  [42.36, -71.06, 'boston'], [38.91, -77.04, 'washington'], [25.76, -80.19, 'miami'],
  [33.75, -84.39, 'atlanta'], [32.78, -96.8, 'dallas'], [29.76, -95.37, 'houston'],
  [33.45, -112.07, 'phoenix'], [39.95, -75.17, 'philadelphia'], [32.72, -117.16, 'san diego'],
  [49.28, -123.12, 'vancouver'], [51.05, -114.07, 'calgary'], [45.42, -75.7, 'ottawa'],
  [22.32, 114.17, 'hong kong'], [13.76, 100.5, 'bangkok'], [-6.21, 106.85, 'jakarta'],
  [14.6, 120.98, 'manila'], [3.14, 101.69, 'kuala lumpur'], [21.03, 105.85, 'hanoi'],
  [10.82, 106.63, 'ho chi minh city'], [35.69, 51.39, 'tehran'], [24.71, 46.68, 'riyadh'],
  [25.29, 51.53, 'doha'], [24.45, 54.38, 'abu dhabi'], [32.08, 34.78, 'tel aviv'],
  [-33.92, 18.42, 'cape town'], [33.57, -7.59, 'casablanca'], [45.76, 4.84, 'lyon'],
  [43.7, 7.27, 'nice'], [43.6, 1.44, 'toulouse'], [47.22, -1.55, 'nantes'],
  [40.85, 14.27, 'naples'], [45.07, 7.69, 'turin'], [39.47, -0.38, 'valencia'],
  [37.39, -5.99, 'seville'], [41.16, -8.61, 'porto'], [-27.47, 153.03, 'brisbane'],
  [-31.95, 115.86, 'perth'], [-36.85, 174.76, 'auckland'], [-0.18, -78.47, 'quito'],
  [10.48, -66.9, 'caracas'], [-22.91, -43.17, 'rio de janeiro'], [-15.79, -47.88, 'brasilia'],
  [20.67, -103.35, 'guadalajara'], [25.69, -100.32, 'monterrey'], [1.29, 103.85, 'singapore city'],
];

const CITY_CENTROIDS = new Map<string, [number, number]>();
for (const [lat, lng, name] of CITIES) CITY_CENTROIDS.set(name, [lat, lng]);

/** Approximate [lat, lng] for a city name, or null when unknown. */
export function cityCentroid(value: unknown): [number, number] | null {
  if (typeof value !== 'string') return null;
  return CITY_CENTROIDS.get(value.trim().toLowerCase()) ?? null;
}

/** Scan a free-text string (e.g. an address) for a known city name and return
 *  its centroid — word-based n-grams (1–3 words, longest first) so "…, New York"
 *  matches "new york", not a substring of another word. Null when none found. */
export function cityCentroidFromText(value: unknown): [number, number] | null {
  if (typeof value !== 'string') return null;
  const tokens = value.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (let n = 3; n >= 1; n -= 1) {
    for (let i = 0; i + n <= tokens.length; i += 1) {
      const hit = CITY_CENTROIDS.get(tokens.slice(i, i + n).join(' '));
      if (hit) return hit;
    }
  }
  return null;
}
