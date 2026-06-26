/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   countryCentroids.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Offline country → approximate centroid (lat, lng) lookup, so a plain
 * `country` text/select column can plot on the MapView without a network
 * geocoder (which the app deliberately has none of). Keyed by lowercased
 * full name + ISO 3166 alpha-2/alpha-3. Coordinates are rough geographic
 * centers (marker placement, not precise borders).
 *
 * ponytail: ~70 of the most common countries — extend the table for fuller
 *   coverage. City-level text still needs a geocoder (the residual limit).
 */

/** [lat, lng, ...lowercased aliases]. */
const COUNTRIES: [number, number, ...string[]][] = [
  [33, 66, 'afghanistan', 'af', 'afg'],
  [41, 20, 'albania', 'al', 'alb'],
  [28, 3, 'algeria', 'dz', 'dza'],
  [-34, -64, 'argentina', 'ar', 'arg'],
  [40, 45, 'armenia', 'am', 'arm'],
  [-25, 134, 'australia', 'au', 'aus'],
  [47.5, 14.5, 'austria', 'at', 'aut'],
  [40.5, 47.5, 'azerbaijan', 'az', 'aze'],
  [26, 50.5, 'bahrain', 'bh', 'bhr'],
  [24, 90, 'bangladesh', 'bd', 'bgd'],
  [53, 28, 'belarus', 'by', 'blr'],
  [50.8, 4, 'belgium', 'be', 'bel'],
  [-17, -65, 'bolivia', 'bo', 'bol'],
  [44, 18, 'bosnia and herzegovina', 'ba', 'bih'],
  [-10, -55, 'brazil', 'br', 'bra'],
  [43, 25, 'bulgaria', 'bg', 'bgr'],
  [13, 105, 'cambodia', 'kh', 'khm'],
  [7, 21, 'cameroon', 'cm', 'cmr'],
  [60, -96, 'canada', 'ca', 'can'],
  [-30, -71, 'chile', 'cl', 'chl'],
  [35, 105, 'china', 'cn', 'chn'],
  [4, -73, 'colombia', 'co', 'col'],
  [10, -84, 'costa rica', 'cr', 'cri'],
  [45.1, 15.2, 'croatia', 'hr', 'hrv'],
  [22, -80, 'cuba', 'cu', 'cub'],
  [35, 33, 'cyprus', 'cy', 'cyp'],
  [49.8, 15.5, 'czechia', 'czech republic', 'cz', 'cze'],
  [56, 10, 'denmark', 'dk', 'dnk'],
  [19, -70.7, 'dominican republic', 'do', 'dom'],
  [-1.8, -78, 'ecuador', 'ec', 'ecu'],
  [27, 30, 'egypt', 'eg', 'egy'],
  [13.8, -88.9, 'el salvador', 'sv', 'slv'],
  [59, 26, 'estonia', 'ee', 'est'],
  [8, 38, 'ethiopia', 'et', 'eth'],
  [64, 26, 'finland', 'fi', 'fin'],
  [46, 2, 'france', 'fr', 'fra'],
  [42, 43.5, 'georgia', 'ge', 'geo'],
  [51, 9, 'germany', 'de', 'deu'],
  [8, -2, 'ghana', 'gh', 'gha'],
  [39, 22, 'greece', 'gr', 'grc'],
  [15.5, -90.3, 'guatemala', 'gt', 'gtm'],
  [15, -86.5, 'honduras', 'hn', 'hnd'],
  [22.3, 114.2, 'hong kong', 'hk', 'hkg'],
  [47, 20, 'hungary', 'hu', 'hun'],
  [65, -18, 'iceland', 'is', 'isl'],
  [22, 79, 'india', 'in', 'ind'],
  [-2, 118, 'indonesia', 'id', 'idn'],
  [32, 53, 'iran', 'ir', 'irn'],
  [33, 44, 'iraq', 'iq', 'irq'],
  [53, -8, 'ireland', 'ie', 'irl'],
  [31, 35, 'israel', 'il', 'isr'],
  [42.8, 12.8, 'italy', 'it', 'ita'],
  [18, -77, 'jamaica', 'jm', 'jam'],
  [36, 138, 'japan', 'jp', 'jpn'],
  [31, 36, 'jordan', 'jo', 'jor'],
  [48, 68, 'kazakhstan', 'kz', 'kaz'],
  [1, 38, 'kenya', 'ke', 'ken'],
  [29.3, 47.6, 'kuwait', 'kw', 'kwt'],
  [57, 25, 'latvia', 'lv', 'lva'],
  [34, 36, 'lebanon', 'lb', 'lbn'],
  [56, 24, 'lithuania', 'lt', 'ltu'],
  [49.8, 6.1, 'luxembourg', 'lu', 'lux'],
  [2.5, 112.5, 'malaysia', 'my', 'mys'],
  [23, -102, 'mexico', 'mx', 'mex'],
  [47, 29, 'moldova', 'md', 'mda'],
  [32, -6, 'morocco', 'ma', 'mar'],
  [52.5, 5.75, 'netherlands', 'nl', 'nld'],
  [-41, 174, 'new zealand', 'nz', 'nzl'],
  [9, 8, 'nigeria', 'ng', 'nga'],
  [62, 10, 'norway', 'no', 'nor'],
  [21, 57, 'oman', 'om', 'omn'],
  [30, 70, 'pakistan', 'pk', 'pak'],
  [9, -80, 'panama', 'pa', 'pan'],
  [-10, -76, 'peru', 'pe', 'per'],
  [13, 122, 'philippines', 'ph', 'phl'],
  [52, 20, 'poland', 'pl', 'pol'],
  [39.5, -8, 'portugal', 'pt', 'prt'],
  [25.3, 51.2, 'qatar', 'qa', 'qat'],
  [46, 25, 'romania', 'ro', 'rou'],
  [60, 100, 'russia', 'ru', 'rus'],
  [24, 45, 'saudi arabia', 'sa', 'sau'],
  [44, 21, 'serbia', 'rs', 'srb'],
  [1.35, 103.8, 'singapore', 'sg', 'sgp'],
  [48.7, 19.5, 'slovakia', 'sk', 'svk'],
  [46.1, 14.8, 'slovenia', 'si', 'svn'],
  [-29, 24, 'south africa', 'za', 'zaf'],
  [36, 128, 'south korea', 'korea', 'kr', 'kor'],
  [40, -4, 'spain', 'es', 'esp'],
  [7, 81, 'sri lanka', 'lk', 'lka'],
  [62, 15, 'sweden', 'se', 'swe'],
  [47, 8, 'switzerland', 'ch', 'che'],
  [23.7, 121, 'taiwan', 'tw', 'twn'],
  [15, 101, 'thailand', 'th', 'tha'],
  [34, 9, 'tunisia', 'tn', 'tun'],
  [39, 35, 'turkey', 'türkiye', 'tr', 'tur'],
  [49, 32, 'ukraine', 'ua', 'ukr'],
  [24, 54, 'united arab emirates', 'uae', 'ae', 'are'],
  [54, -2, 'united kingdom', 'uk', 'great britain', 'gb', 'gbr'],
  [39, -98, 'united states', 'united states of america', 'usa', 'us'],
  [-33, -56, 'uruguay', 'uy', 'ury'],
  [41, 64, 'uzbekistan', 'uz', 'uzb'],
  [8, -66, 'venezuela', 've', 'ven'],
  [16, 106, 'vietnam', 'vn', 'vnm'],
];

const CENTROIDS = new Map<string, [number, number]>();
for (const [lat, lng, ...aliases] of COUNTRIES) {
  for (const alias of aliases) CENTROIDS.set(alias, [lat, lng]);
}

/** Approximate [lat, lng] for a country name / ISO code, or null when unknown. */
export function countryCentroid(value: unknown): [number, number] | null {
  if (typeof value !== 'string') return null;
  return CENTROIDS.get(value.trim().toLowerCase()) ?? null;
}
