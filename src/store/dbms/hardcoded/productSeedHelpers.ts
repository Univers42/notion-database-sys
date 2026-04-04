/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   productSeedHelpers.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Product Catalog — helper / utility functions

export function mulberry32(seed: number): () => number {
  return () => {
    seed = Math.trunc(seed); seed = Math.trunc(seed + 0x6D2B79F5);
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items.at(-1)!; // NOSONAR
}

export function getTags(idx: number, catIdx: number): string[] {
  const tags: string[] = [];
  if (idx % 5 === 0) tags.push('ptag-prem');
  if ((catIdx === 5 || catIdx === 6 || catIdx === 9) && idx % 3 === 0) tags.push('ptag-org');
  if (idx % 11 === 0) tags.push('ptag-ltd');
  if (idx % 7 === 0) tags.push('ptag-best');
  if (idx % 13 === 0) tags.push('ptag-clear');
  if (idx > 240) tags.push('ptag-new');
  if ((catIdx === 6 || catIdx === 9) && idx % 4 === 0) tags.push('ptag-eco');
  if (catIdx === 7 && idx % 6 === 0) tags.push('ptag-hand');
  return tags.length > 0 ? tags : ['ptag-new'];
}

export function getBrandTags(idx: number): string[] {
  const tags: string[] = [];
  if (idx % 12 === 0) tags.push('pbrd-lux');
  else if (idx % 8 === 0) tags.push('pbrd-des');
  else if (idx % 5 === 0) tags.push('pbrd-mid');
  else if (idx % 3 === 0) tags.push('pbrd-bud');
  else tags.push('pbrd-gen');
  if (idx % 15 === 0) tags.push('pbrd-ind');
  return tags;
}

export function getRelatedProducts(globalIdx: number): string[] {
  if (globalIdx % 10 === 0) return ['i1', 'i3'];
  if (globalIdx % 7 === 0) return ['i2'];
  return [];
}
