/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   productSeedPages.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:39:42 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 01:31:18 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Product Catalog — page generation (300 product pages)
import type { Page } from '../../../types/database';
import { DB_PRODUCTS, _d, CATEGORY_OPTIONS } from './productSeedOptions';
import { CATEGORY_PRODUCTS } from './productSeedNames';
import {
  WAREHOUSES, ORIGINS, MANAGERS, BASE_PRICES, PRICE_MULT,
  STOCK_IDS, CONDITION_IDS, RATING_IDS, SHIPPING_IDS,
  STOCK_WEIGHTS, CONDITION_WEIGHTS, RATING_WEIGHTS,
  SHIPPING_WEIGHTS, CATEGORY_WEIGHTS,
  DESC_TEMPLATES, NOTES_TEMPLATES, VENDORS,
} from './productSeedData';
import {
  mulberry32, weightedPick, getTags, getBrandTags, getRelatedProducts,
} from './productSeedHelpers';

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
