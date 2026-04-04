/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   productSeedPages.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:39:42 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Product Catalog — page generation (warehouses, origins, helpers, 300 product pages)
import type { Page } from '../../../types/database';
import {
  DB_PRODUCTS, _d,
  CATEGORY_OPTIONS, STOCK_OPTIONS, CONDITION_OPTIONS,
  RATING_OPTIONS, SHIPPING_OPTIONS, BRAND_TAG_OPTIONS,
} from './productSeedOptions';
import { CATEGORY_PRODUCTS } from './productSeedNames';

const WAREHOUSES: { address: string; lat: number; lng: number }[] = [
  { address: 'Sacramento, CA, USA',         lat: 38.5816,  lng: -121.4944 },
  { address: 'Newark, NJ, USA',             lat: 40.7357,  lng: -74.1724 },
  { address: 'Frankfurt, Germany',           lat: 50.1109,  lng: 8.6821 },
  { address: 'Tokyo, Japan',                 lat: 35.6762,  lng: 139.6503 },
  { address: 'Austin, TX, USA',             lat: 30.2672,  lng: -97.7431 },
  { address: 'London, United Kingdom',       lat: 51.5074,  lng: -0.1278 },
  { address: 'Sydney, Australia',            lat: -33.8688, lng: 151.2093 },
  { address: 'São Paulo, Brazil',           lat: -23.5505, lng: -46.6333 },
  { address: 'Mumbai, India',               lat: 19.076,   lng: 72.8777 },
  { address: 'Toronto, Canada',             lat: 43.6532,  lng: -79.3832 },
  { address: 'Singapore',                    lat: 1.3521,   lng: 103.8198 },
  { address: 'Dubai, UAE',                  lat: 25.2048,  lng: 55.2708 },
  { address: 'Shanghai, China',             lat: 31.2304,  lng: 121.4737 },
  { address: 'Cape Town, South Africa',     lat: -33.9249, lng: 18.4241 },
  { address: 'Mexico City, Mexico',         lat: 19.4326,  lng: -99.1332 },
];

const ORIGINS: { address: string; lat: number; lng: number }[] = [
  { address: 'Shenzhen, China',       lat: 22.5431, lng: 114.0579 },
  { address: 'Dhaka, Bangladesh',     lat: 23.8103, lng: 90.4125 },
  { address: 'Milan, Italy',          lat: 45.4642, lng: 9.19 },
  { address: 'Osaka, Japan',          lat: 34.6937, lng: 135.5023 },
  { address: 'Seoul, South Korea',    lat: 37.5665, lng: 126.978 },
  { address: 'Ho Chi Minh, Vietnam',  lat: 10.8231, lng: 106.6297 },
  { address: 'Guadalajara, Mexico',   lat: 20.6597, lng: -103.3496 },
  { address: 'Berlin, Germany',       lat: 52.52,   lng: 13.405 },
  { address: 'Istanbul, Turkey',      lat: 41.0082, lng: 28.9784 },
  { address: 'Portland, OR, USA',     lat: 45.5152, lng: -122.6784 },
];

const MANAGERS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const BASE_PRICES = [149.99, 59.99, 39.99, 24.99, 44.99, 29.99, 12.99, 34.99, 59.99, 49.99];
const PRICE_MULT = [
  1, 0.6, 2.2, 0.8, 0.5, 1.4, 0.3, 1.8, 1.1, 0.7,
  0.9, 1.5, 0.4, 1.2, 0.65, 1.3, 0.55, 2, 0.75, 1.6,
  0.45, 1.7, 0.85, 1.15, 0.35, 1.9, 0.95, 0.5, 1.05, 0.72,
];
const STOCK_IDS = STOCK_OPTIONS.map(o => o.id);
const CONDITION_IDS = CONDITION_OPTIONS.map(o => o.id);
const RATING_IDS = RATING_OPTIONS.map(o => o.id);
const SHIPPING_IDS = SHIPPING_OPTIONS.map(o => o.id);
const _BRAND_TAG_IDS = BRAND_TAG_OPTIONS.map(o => o.id);

function mulberry32(seed: number): () => number {
  return () => {
    seed = Math.trunc(seed); seed = Math.trunc(seed + 0x6D2B79F5);
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items.at(-1)!; // NOSONAR
}
const STOCK_WEIGHTS   = [45, 22, 12, 5, 16];
const CONDITION_WEIGHTS = [58, 18, 8, 16];
const RATING_WEIGHTS  = [22, 38, 24, 11, 5];
const SHIPPING_WEIGHTS = [32, 28, 18, 10, 12];
const CATEGORY_WEIGHTS = [18, 15, 13, 5, 10, 12, 7, 4, 9, 7];

function getTags(idx: number, catIdx: number): string[] {
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

function getBrandTags(idx: number): string[] {
  const tags: string[] = [];
  if (idx % 12 === 0) tags.push('pbrd-lux');
  else if (idx % 8 === 0) tags.push('pbrd-des');
  else if (idx % 5 === 0) tags.push('pbrd-mid');
  else if (idx % 3 === 0) tags.push('pbrd-bud');
  else tags.push('pbrd-gen');
  if (idx % 15 === 0) tags.push('pbrd-ind');
  return tags;
}

const DESC_TEMPLATES = [
  'High-performance electronic device with premium build quality and cutting-edge technology.',
  'Stylish and comfortable apparel crafted from premium materials for everyday wear.',
  'Essential kitchen & home item designed for durability and modern aesthetics.',
  'Insightful reading material covering key topics with clear and engaging prose.',
  'Professional-grade sports equipment for training, competition, and outdoor adventures.',
  'Premium beauty and wellness product made with natural, skin-friendly ingredients.',
  'Carefully sourced gourmet food item — fresh, flavorful, and sustainably produced.',
  'Fun and educational toy that sparks creativity and keeps the whole family entertained.',
  'Durable professional-grade tool built for precision and reliability on every job.',
  'Beautiful outdoor & garden essential for transforming your green spaces.',
];
const NOTES_TEMPLATES = [
  'Restock by Q2. Supplier confirmed pricing for next batch.',
  'Top performer in monthly sales report. Consider expanding SKUs.',
  'Quality inspection passed. Minor packaging update planned.',
  'Customer feedback positive — 4.5+ avg rating on storefront.',
  'Seasonal item — plan markdowns after peak season.',
  'New supplier evaluated. Cost reduction potential ~15%.',
  'Warranty claim rate under 2%. Excellent durability metrics.',
  'Cross-sell opportunity with related accessories.',
  'Photography needed for updated product listing.',
  'Competitor analysis complete — pricing is competitive.',
];
const VENDORS = [
  'techsupply.com', 'fabricworld.com', 'homegoods.co', 'bookdist.com', 'sportsgear.io',
  'beautyline.co', 'freshfoods.com', 'toyland.co', 'toolpro.com', 'greengarden.co',
];

function getRelatedProducts(globalIdx: number): string[] {
  if (globalIdx % 10 === 0) return ['i1', 'i3'];
  if (globalIdx % 7 === 0) return ['i2'];
  return [];
}

function generateProductPages(): Record<string, Page> {
  const pages: Record<string, Page> = {};
  let globalIdx = 0;
  CATEGORY_PRODUCTS.forEach((products, catIdx) => {
    products.forEach((name, itemIdx) => {
      globalIdx++;
      const id = `pd${globalIdx}`;
      const rng = mulberry32(globalIdx * 7919 + catIdx * 104729 + itemIdx * 49157);
      const keepNatural = rng() < 0.6;
      const catId = keepNatural
        ? CATEGORY_OPTIONS[catIdx].id
        : weightedPick(CATEGORY_OPTIONS.map(o => o.id), CATEGORY_WEIGHTS, rng);
      const price = Math.round(BASE_PRICES[catIdx] * PRICE_MULT[itemIdx % PRICE_MULT.length] * 100) / 100;
      const cost = Math.round(price * (0.35 + (globalIdx % 30) * 0.01) * 100) / 100;
      const weight = Math.round((0.1 + (globalIdx % 50) * 0.15) * 100) / 100;
      const stockId = weightedPick(STOCK_IDS, STOCK_WEIGHTS, rng);
      const conditionId = weightedPick(CONDITION_IDS, CONDITION_WEIGHTS, rng);
      const ratingId = weightedPick(RATING_IDS, RATING_WEIGHTS, rng);
      const shippingId = weightedPick(SHIPPING_IDS, SHIPPING_WEIGHTS, rng);
      const managerIdx = globalIdx % MANAGERS.length;
      const reviewerIdx = (globalIdx + 3) % MANAGERS.length;
      const warehouseIdx = globalIdx % WAREHOUSES.length;
      const originIdx = globalIdx % ORIGINS.length;
      const daysAgo = -600 + globalIdx * 2;
      const wh = WAREHOUSES[warehouseIdx];
      const orig = ORIGINS[originIdx];
      pages[id] = {
        id, databaseId: DB_PRODUCTS,
        properties: {
          'pp-name': name, 'pp-desc': DESC_TEMPLATES[catIdx],
          'pp-notes': NOTES_TEMPLATES[globalIdx % NOTES_TEMPLATES.length],
          'pp-price': price, 'pp-cost': cost, 'pp-weight': weight,
          'pp-category': catId, 'pp-condition': conditionId,
          'pp-rating': ratingId, 'pp-shipping': shippingId,
          'pp-tags': getTags(globalIdx, catIdx), 'pp-brand-tags': getBrandTags(globalIdx),
          'pp-stock': stockId, 'pp-release': _d(daysAgo), 'pp-warranty-exp': _d(daysAgo + 365),
          'pp-featured': globalIdx % 5 === 0, 'pp-returnable': globalIdx % 3 !== 0,
          'pp-manager': MANAGERS[managerIdx], 'pp-reviewer': MANAGERS[reviewerIdx],
          'pp-url': `https://shop.example.com/product/${globalIdx}`,
          'pp-manual-url': globalIdx % 4 === 0 ? `https://docs.example.com/manual/${globalIdx}` : '',
          'pp-email': `vendor${(catIdx + 1)}@${VENDORS[catIdx]}`,
          'pp-phone': `+1-555-${String(2000 + globalIdx).padStart(4, '0')}`,
          'pp-warehouse': { address: `${wh.address}, Aisle ${(itemIdx % 8) + 1}`, lat: wh.lat + (itemIdx * 0.003 - 0.04), lng: wh.lng + (itemIdx * 0.004 - 0.05) },
          'pp-origin': { address: orig.address, lat: orig.lat, lng: orig.lng },
          'pp-sku': `SKU-${globalIdx}`,
          'pp-related': getRelatedProducts(globalIdx),
          'pp-assigned': globalIdx % 3 === 0 ? [MANAGERS[managerIdx]] : [MANAGERS[managerIdx], MANAGERS[reviewerIdx]],
          'pp-due': _d(daysAgo + 30 + (globalIdx % 14) * 7),
          'pp-stock-qty': Math.floor(10 + rng() * 490),
        },
        content: globalIdx <= 5 ? [{ id: `bpd${globalIdx}`, type: 'paragraph', content: `Detailed product page for ${name}. Features premium materials and excellent customer reviews.` }] : [],
        createdAt: _d(daysAgo - 10), updatedAt: _d(daysAgo + Math.floor(Math.random() * 20)),
        createdBy: MANAGERS[managerIdx], lastEditedBy: MANAGERS[reviewerIdx],
      };
    });
  });
  return pages;
}

export const productPages = generateProductPages();
