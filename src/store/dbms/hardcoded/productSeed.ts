/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   productSeed.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:39:35 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 15:44:26 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Product Catalog — 300-record seed database using ALL 24 property types

import type { DatabaseSchema } from '../../../types/database';
import {
  DB_PRODUCTS, CATEGORY_OPTIONS, TAG_OPTIONS, STOCK_OPTIONS,
  CONDITION_OPTIONS, RATING_OPTIONS, SHIPPING_OPTIONS, BRAND_TAG_OPTIONS,
} from './productSeedOptions';

export { DB_PRODUCTS } from './productSeedOptions';
export { productPages } from './productSeedPages';
export { productViews } from './productSeedViews';

export const productDatabase: DatabaseSchema = {
  id: DB_PRODUCTS,
  name: 'Product Catalog',
  icon: '🛍️',
  titlePropertyId: 'pp-name',
  properties: {
    // ── title ──
    'pp-name':         { id: 'pp-name',       name: 'Product Name',      type: 'title' },
    // ── text × 2 ──
    'pp-desc':         { id: 'pp-desc',       name: 'Description',       type: 'text' },
    'pp-notes':        { id: 'pp-notes',      name: 'Internal Notes',    type: 'text' },
    // ── number × 3 ──
    'pp-price':        { id: 'pp-price',      name: 'Price ($)',         type: 'number' },
    'pp-cost':         { id: 'pp-cost',       name: 'Cost ($)',          type: 'number' },
    'pp-weight':       { id: 'pp-weight',     name: 'Weight (kg)',       type: 'number' },
    // ── select × 4 ──
    'pp-category':     { id: 'pp-category',   name: 'Category',   type: 'select', options: CATEGORY_OPTIONS },
    'pp-condition':    { id: 'pp-condition',  name: 'Condition',  type: 'select', options: CONDITION_OPTIONS },
    'pp-rating':       { id: 'pp-rating',     name: 'Rating',     type: 'select', options: RATING_OPTIONS },
    'pp-shipping':     { id: 'pp-shipping',   name: 'Shipping',   type: 'select', options: SHIPPING_OPTIONS },
    // ── multi_select × 2 ──
    'pp-tags':         { id: 'pp-tags',       name: 'Tags',          type: 'multi_select', options: TAG_OPTIONS },
    'pp-brand-tags':   { id: 'pp-brand-tags', name: 'Brand Tier',    type: 'multi_select', options: BRAND_TAG_OPTIONS },
    // ── status ──
    'pp-stock':        {
      id: 'pp-stock', name: 'Stock Status', type: 'status',
      options: STOCK_OPTIONS,
      statusGroups: [
        { id: 'psg-avail',   label: 'Available',   color: 'bg-success-surface-medium text-success-text-tag',  optionIds: ['pstk-in', 'pstk-low'] },
        { id: 'psg-limited', label: 'Limited',      color: 'bg-warning-surface-medium text-warning-text-tag', optionIds: ['pstk-pre'] },
        { id: 'psg-gone',    label: 'Unavailable',  color: 'bg-danger-surface-medium text-danger-text-tag',      optionIds: ['pstk-out', 'pstk-disc'] },
      ],
    },
    // ── date × 2 ──
    'pp-release':      { id: 'pp-release',    name: 'Release Date',      type: 'date' },
    'pp-warranty-exp': { id: 'pp-warranty-exp', name: 'Warranty Expires', type: 'date' },
    // ── checkbox × 2 ──
    'pp-featured':     { id: 'pp-featured',   name: 'Featured',          type: 'checkbox' },
    'pp-returnable':   { id: 'pp-returnable', name: 'Returnable',        type: 'checkbox' },
    // ── person ──
    'pp-manager':      { id: 'pp-manager',    name: 'Product Manager',   type: 'person' },
    // ── user ──
    'pp-reviewer':     { id: 'pp-reviewer',   name: 'QA Reviewer',       type: 'user' },
    // ── url × 2 ──
    'pp-url':          { id: 'pp-url',        name: 'Product Page',      type: 'url' },
    'pp-manual-url':   { id: 'pp-manual-url', name: 'Manual / Doc',      type: 'url' },
    // ── email ──
    'pp-email':        { id: 'pp-email',      name: 'Vendor Email',      type: 'email' },
    // ── phone ──
    'pp-phone':        { id: 'pp-phone',      name: 'Vendor Phone',      type: 'phone' },
    // ── files_media ──
    'pp-image':        { id: 'pp-image',      name: 'Product Image',     type: 'files_media' },
    // ── relation ──
    'pp-related':      {
      id: 'pp-related', name: 'Related Assets', type: 'relation',
      relationConfig: { databaseId: 'db-inventory', type: 'one_way' },
    },
    // ── formula × 11 ──
    'pp-margin':       {
      id: 'pp-margin', name: 'Margin ($)', type: 'formula',
      formulaConfig: { expression: 'prop("Price ($)") - prop("Cost ($)")' },
    },
    'pp-margin-pct':   {
      id: 'pp-margin-pct', name: 'Margin %', type: 'formula',
      formulaConfig: { expression: 'if(prop("Price ($)") > 0, round((prop("Price ($)") - prop("Cost ($)")) / prop("Price ($)") * 100), 0)' },
    },
    'pp-price-tier':   {
      id: 'pp-price-tier', name: 'Price Tier', type: 'formula',
      formulaConfig: { expression: 'ifs(prop("Price ($)") >= 200, "Premium", prop("Price ($)") >= 100, "Mid-Range", prop("Price ($)") >= 50, "Standard", "Budget")' },
    },
    'pp-weight-label': {
      id: 'pp-weight-label', name: 'Weight Class', type: 'formula',
      formulaConfig: { expression: 'concat(ifs(prop("Weight (kg)") > 5, "Heavy", prop("Weight (kg)") > 2, "Medium", "Light"), " ", format(round(prop("Weight (kg)") * 1000)), "g")' },
    },
    'pp-days-listed':  {
      id: 'pp-days-listed', name: 'Days Listed', type: 'formula',
      formulaConfig: { expression: 'dateBetween(now(), prop("Release Date"), "days")' },
    },
    'pp-warranty-ok':  {
      id: 'pp-warranty-ok', name: 'Warranty OK', type: 'formula',
      formulaConfig: { expression: 'if(empty(prop("Warranty Expires")), false, prop("Warranty Expires") > now())' },
    },
    'pp-profit-score': {
      id: 'pp-profit-score', name: 'Profit Score', type: 'formula',
      formulaConfig: { expression: 'round(((prop("Price ($)") - prop("Cost ($)")) / max(prop("Cost ($)"), 1)) * sqrt(max(prop("Stock Qty"), 0)) * 10) / 10' },
    },
    'pp-inv-value':    {
      id: 'pp-inv-value', name: 'Inventory Value', type: 'formula',
      formulaConfig: { expression: 'round(prop("Price ($)") * prop("Stock Qty") * 100) / 100' },
    },
    'pp-is-bargain':   {
      id: 'pp-is-bargain', name: 'Is Bargain', type: 'formula',
      formulaConfig: { expression: 'and(prop("Price ($)") < 30, not(prop("Featured")), prop("Returnable"))' },
    },
    'pp-price-per-kg': {
      id: 'pp-price-per-kg', name: 'Price/kg', type: 'formula',
      formulaConfig: { expression: 'if(prop("Weight (kg)") > 0, round(prop("Price ($)") / prop("Weight (kg)") * 100) / 100, 0)' },
    },
    'pp-deal-tag':     {
      id: 'pp-deal-tag', name: 'Deal Tag', type: 'formula',
      formulaConfig: { expression: 'ifs(and(prop("Price ($)") < 20, prop("Returnable")), "🔥 Hot Deal", and(prop("Price ($)") < 50, not(prop("Featured"))), "💰 Value Pick", prop("Featured"), "⭐ Featured", "📦 Standard")' },
    },
    // ── rollup ──
    'pp-asset-count':  {
      id: 'pp-asset-count', name: 'Asset Count', type: 'rollup',
      rollupConfig: { relationPropertyId: 'pp-related', targetPropertyId: 'prop-price', function: 'count' },
    },
    // ── button ──
    'pp-buy':          {
      id: 'pp-buy', name: 'Buy Now', type: 'button',
      buttonConfig: { label: 'Buy', action: 'open_url', url: 'https://shop.example.com' },
    },
    // ── place × 2 (with real coords) ──
    'pp-warehouse':    { id: 'pp-warehouse',    name: 'Warehouse',        type: 'place' },
    'pp-origin':       { id: 'pp-origin',       name: 'Origin Country',   type: 'place' },
    // ── id ──
    'pp-sku':          { id: 'pp-sku', name: 'SKU', type: 'id', prefix: 'SKU-', autoIncrement: 301 },
    // ── created_time ──
    'pp-created':      { id: 'pp-created',     name: 'Created',          type: 'created_time' },
    // ── last_edited_time ──
    'pp-edited':       { id: 'pp-edited',      name: 'Last Edited',      type: 'last_edited_time' },
    // ── created_by ──
    'pp-created-by':   { id: 'pp-created-by',  name: 'Created By',       type: 'created_by' },
    // ── last_edited_by ──
    'pp-edited-by':    { id: 'pp-edited-by',   name: 'Edited By',        type: 'last_edited_by' },
    // ── assigned_to ──
    'pp-assigned':     { id: 'pp-assigned',    name: 'Assigned To',      type: 'assigned_to' },
    // ── due_date ──
    'pp-due':          { id: 'pp-due',         name: 'Due Date',         type: 'due_date' },
    // ── custom (database-engine int) ──
    'pp-stock-qty':    {
      id: 'pp-stock-qty', name: 'Stock Qty', type: 'custom',
      customConfig: { dataType: 'integer' },
    },
  },
};
