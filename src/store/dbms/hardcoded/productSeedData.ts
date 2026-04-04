/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   productSeedData.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Product Catalog — constants, lookup tables, templates
import {
  STOCK_OPTIONS, CONDITION_OPTIONS,
  RATING_OPTIONS, SHIPPING_OPTIONS, BRAND_TAG_OPTIONS,
} from './productSeedOptions';

export const WAREHOUSES: { address: string; lat: number; lng: number }[] = [
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

export const ORIGINS: { address: string; lat: number; lng: number }[] = [
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

export const MANAGERS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
export const BASE_PRICES = [149.99, 59.99, 39.99, 24.99, 44.99, 29.99, 12.99, 34.99, 59.99, 49.99];
export const PRICE_MULT = [
  1, 0.6, 2.2, 0.8, 0.5, 1.4, 0.3, 1.8, 1.1, 0.7,
  0.9, 1.5, 0.4, 1.2, 0.65, 1.3, 0.55, 2, 0.75, 1.6,
  0.45, 1.7, 0.85, 1.15, 0.35, 1.9, 0.95, 0.5, 1.05, 0.72,
];
export const STOCK_IDS = STOCK_OPTIONS.map(o => o.id);
export const CONDITION_IDS = CONDITION_OPTIONS.map(o => o.id);
export const RATING_IDS = RATING_OPTIONS.map(o => o.id);
export const SHIPPING_IDS = SHIPPING_OPTIONS.map(o => o.id);
export const _BRAND_TAG_IDS = BRAND_TAG_OPTIONS.map(o => o.id);

export const STOCK_WEIGHTS   = [45, 22, 12, 5, 16];
export const CONDITION_WEIGHTS = [58, 18, 8, 16];
export const RATING_WEIGHTS  = [22, 38, 24, 11, 5];
export const SHIPPING_WEIGHTS = [32, 28, 18, 10, 12];
export const CATEGORY_WEIGHTS = [18, 15, 13, 5, 10, 12, 7, 4, 9, 7];

export const DESC_TEMPLATES = [
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
export const NOTES_TEMPLATES = [
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
export const VENDORS = [
  'techsupply.com', 'fabricworld.com', 'homegoods.co', 'bookdist.com', 'sportsgear.io',
  'beautyline.co', 'freshfoods.com', 'toyland.co', 'toolpro.com', 'greengarden.co',
];
