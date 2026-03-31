// Product Catalog — select option definitions and shared constants
import type { SelectOption } from '../types/database';

export const DB_PRODUCTS = 'db-products';

const _now = new Date().toISOString();
export { _now };
export const _d = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

export const CATEGORY_OPTIONS: SelectOption[] = [
  { id: 'pcat-elec',   value: 'Electronics',       color: 'bg-accent-muted text-accent-text-bold' },
  { id: 'pcat-cloth',  value: 'Clothing',           color: 'bg-pink-surface-muted text-pink-text-tag' },
  { id: 'pcat-home',   value: 'Home & Kitchen',     color: 'bg-amber-surface-muted text-amber-text-tag' },
  { id: 'pcat-book',   value: 'Books & Media',      color: 'bg-indigo-surface-muted text-indigo-text-tag' },
  { id: 'pcat-sport',  value: 'Sports & Outdoors',  color: 'bg-success-surface-muted text-success-text-tag' },
  { id: 'pcat-beauty', value: 'Health & Beauty',     color: 'bg-rose-surface-muted text-rose-text-tag' },
  { id: 'pcat-food',   value: 'Food & Grocery',     color: 'bg-orange-surface-muted text-orange-text-tag' },
  { id: 'pcat-toys',   value: 'Toys & Games',       color: 'bg-purple-surface-muted text-purple-text-tag' },
  { id: 'pcat-tools',  value: 'Tools & Hardware',   color: 'bg-surface-muted text-ink-strong' },
  { id: 'pcat-garden', value: 'Garden & Outdoor',   color: 'bg-emerald-surface-muted text-emerald-text-tag' },
];

export const TAG_OPTIONS: SelectOption[] = [
  { id: 'ptag-prem',   value: 'Premium',     color: 'bg-warning-surface-muted text-warning-text-tag' },
  { id: 'ptag-org',    value: 'Organic',      color: 'bg-success-surface-muted text-success-text-tag' },
  { id: 'ptag-ltd',    value: 'Limited',      color: 'bg-danger-surface-muted text-danger-text-tag' },
  { id: 'ptag-best',   value: 'Bestseller',   color: 'bg-accent-muted text-accent-text-bold' },
  { id: 'ptag-clear',  value: 'Clearance',    color: 'bg-surface-muted text-ink-body' },
  { id: 'ptag-new',    value: 'New Arrival',  color: 'bg-cyan-surface-muted text-cyan-text-tag' },
  { id: 'ptag-eco',    value: 'Eco-Friendly', color: 'bg-teal-surface-muted text-teal-text-tag' },
  { id: 'ptag-hand',   value: 'Handmade',     color: 'bg-violet-surface-muted text-violet-text-tag' },
];

export const STOCK_OPTIONS: SelectOption[] = [
  { id: 'pstk-in',   value: 'In Stock',      color: 'bg-success-surface-medium text-success-text-tag' },
  { id: 'pstk-low',  value: 'Low Stock',     color: 'bg-warning-surface-medium text-warning-text-tag' },
  { id: 'pstk-out',  value: 'Out of Stock',  color: 'bg-danger-surface-medium text-danger-text-tag' },
  { id: 'pstk-disc', value: 'Discontinued',  color: 'bg-surface-strong text-ink-body' },
  { id: 'pstk-pre',  value: 'Pre-order',     color: 'bg-accent-subtle text-accent-text-bold' },
];

export const CONDITION_OPTIONS: SelectOption[] = [
  { id: 'pcnd-new',   value: 'New',          color: 'bg-success-surface-muted text-success-text-bold' },
  { id: 'pcnd-ref',   value: 'Refurbished',  color: 'bg-accent-muted text-accent-text' },
  { id: 'pcnd-used',  value: 'Used',         color: 'bg-amber-surface-muted text-amber-text-bold' },
  { id: 'pcnd-open',  value: 'Open Box',     color: 'bg-orange-surface-muted text-orange-text-bold' },
];

export const RATING_OPTIONS: SelectOption[] = [
  { id: 'prt-5', value: '★★★★★ (5.0)', color: 'bg-warning-surface-muted text-warning-text-tag' },
  { id: 'prt-4', value: '★★★★☆ (4.0)', color: 'bg-warning-surface text-warning-text-bold' },
  { id: 'prt-3', value: '★★★☆☆ (3.0)', color: 'bg-orange-surface text-orange-text-bold' },
  { id: 'prt-2', value: '★★☆☆☆ (2.0)', color: 'bg-danger-surface text-danger-text-bold' },
  { id: 'prt-1', value: '★☆☆☆☆ (1.0)', color: 'bg-danger-surface-muted text-danger-text-tag' },
];

export const SHIPPING_OPTIONS: SelectOption[] = [
  { id: 'pship-free',  value: 'Free Shipping',   color: 'bg-success-surface-muted text-success-text-bold' },
  { id: 'pship-std',   value: 'Standard',        color: 'bg-surface-tertiary text-ink-body' },
  { id: 'pship-exp',   value: 'Express',         color: 'bg-accent-muted text-accent-text' },
  { id: 'pship-ovn',   value: 'Overnight',       color: 'bg-purple-surface-muted text-purple-text-bold' },
  { id: 'pship-pick',  value: 'Store Pickup',    color: 'bg-amber-surface-muted text-amber-text-bold' },
];

export const BRAND_TAG_OPTIONS: SelectOption[] = [
  { id: 'pbrd-lux',   value: 'Luxury',       color: 'bg-amber-surface-muted text-amber-text-tag' },
  { id: 'pbrd-bud',   value: 'Budget',       color: 'bg-success-surface-muted text-success-text-tag' },
  { id: 'pbrd-mid',   value: 'Mid-Range',    color: 'bg-accent-muted text-accent-text-bold' },
  { id: 'pbrd-des',   value: 'Designer',     color: 'bg-pink-surface-muted text-pink-text-tag' },
  { id: 'pbrd-gen',   value: 'Generic',      color: 'bg-surface-tertiary text-ink-body' },
  { id: 'pbrd-ind',   value: 'Independent',  color: 'bg-violet-surface-muted text-violet-text-tag' },
];
