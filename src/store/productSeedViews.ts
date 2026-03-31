// Product Catalog — view configurations
import type { ViewConfig } from '../types/database';
import { DB_PRODUCTS } from './productSeedOptions';

export const productViews: Record<string, ViewConfig> = {
  'v-prod-table': {
    id: 'v-prod-table', databaseId: DB_PRODUCTS, name: 'All Products', type: 'table',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: [
      'pp-name', 'pp-category', 'pp-price', 'pp-cost', 'pp-margin', 'pp-margin-pct', 'pp-price-tier',
      'pp-weight-label', 'pp-days-listed', 'pp-warranty-ok', 'pp-profit-score', 'pp-inv-value',
      'pp-is-bargain', 'pp-price-per-kg', 'pp-deal-tag',
      'pp-stock', 'pp-tags', 'pp-condition', 'pp-rating', 'pp-shipping', 'pp-featured', 'pp-returnable',
      'pp-release', 'pp-due', 'pp-assigned', 'pp-manager', 'pp-sku', 'pp-warehouse', 'pp-weight',
      'pp-stock-qty', 'pp-related', 'pp-asset-count',
    ],
    settings: { showVerticalLines: true },
  },
  'v-prod-board': {
    id: 'v-prod-board', databaseId: DB_PRODUCTS, name: 'Stock Board', type: 'board',
    filters: [], filterConjunction: 'and', sorts: [],
    grouping: { propertyId: 'pp-stock' },
    visibleProperties: ['pp-name', 'pp-category', 'pp-price', 'pp-tags', 'pp-featured', 'pp-rating'],
    settings: { colorColumns: true, cardSize: 'medium' },
  },
  'v-prod-gallery': {
    id: 'v-prod-gallery', databaseId: DB_PRODUCTS, name: 'Gallery', type: 'gallery',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-category', 'pp-price', 'pp-stock', 'pp-rating', 'pp-condition'],
    settings: { cardSize: 'medium', cardPreview: 'none' },
  },
  'v-prod-list': {
    id: 'v-prod-list', databaseId: DB_PRODUCTS, name: 'List by Category', type: 'list',
    filters: [], filterConjunction: 'and', sorts: [],
    grouping: { propertyId: 'pp-category' },
    visibleProperties: ['pp-name', 'pp-price', 'pp-stock', 'pp-manager', 'pp-release', 'pp-rating'],
    settings: { showPageIcon: true },
  },
  'v-prod-calendar': {
    id: 'v-prod-calendar', databaseId: DB_PRODUCTS, name: 'Release Calendar', type: 'calendar',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-stock', 'pp-category'],
    settings: { showWeekends: true, showCalendarAs: 'month', showCalendarBy: 'pp-release' },
  },
  'v-prod-timeline': {
    id: 'v-prod-timeline', databaseId: DB_PRODUCTS, name: 'Timeline', type: 'timeline',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-stock', 'pp-category', 'pp-price'],
    settings: { showTable: true, zoomLevel: 'month', showTimelineBy: 'pp-release' },
  },
  'v-prod-chart': {
    id: 'v-prod-chart', databaseId: DB_PRODUCTS, name: 'Price by Category', type: 'chart',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-category', 'pp-price'],
    settings: { chartType: 'vertical_bar', xAxisProperty: 'pp-category', yAxisProperty: 'pp-price', yAxisAggregation: 'average', colorPalette: 'default' },
  },
  'v-prod-feed': {
    id: 'v-prod-feed', databaseId: DB_PRODUCTS, name: 'Feed', type: 'feed',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-desc', 'pp-category', 'pp-price', 'pp-stock', 'pp-tags', 'pp-rating'],
    settings: {},
  },
  'v-prod-map': {
    id: 'v-prod-map', databaseId: DB_PRODUCTS, name: 'Warehouse Map', type: 'map',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-warehouse', 'pp-category', 'pp-stock'],
    settings: { mapBy: 'pp-warehouse' },
  },
  'v-prod-dashboard': {
    id: 'v-prod-dashboard', databaseId: DB_PRODUCTS, name: 'Overview Dashboard', type: 'dashboard',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-category', 'pp-price', 'pp-stock', 'pp-featured'],
    settings: {
      widgets: [
        { id: 'w1', type: 'stat', title: 'Total Products', aggregation: 'count', width: 1, height: 1 },
        { id: 'w2', type: 'stat', title: 'Avg Price', propertyId: 'pp-price', aggregation: 'average', width: 1, height: 1 },
        { id: 'w3', type: 'stat', title: 'Total Revenue', propertyId: 'pp-price', aggregation: 'sum', width: 1, height: 1 },
        { id: 'w4', type: 'stat', title: 'Featured Count', propertyId: 'pp-featured', aggregation: 'count', width: 1, height: 1 },
        { id: 'w5', type: 'chart', title: 'Category Distribution', propertyId: 'pp-category', chartStyle: 'stacked_bar', aggregation: 'count', width: 4, height: 1 },
        { id: 'w6', type: 'chart', title: 'By Category', propertyId: 'pp-category', chartStyle: 'donut', aggregation: 'count', width: 2, height: 2 },
        { id: 'w7', type: 'chart', title: 'Shipping Methods', propertyId: 'pp-shipping', chartStyle: 'horizontal_bar', aggregation: 'count', width: 2, height: 2 },
        { id: 'w8', type: 'chart', title: 'Category Trends', propertyId: 'pp-category', chartStyle: 'multi_line', aggregation: 'count', width: 4, height: 2 },
        { id: 'w9', type: 'table', title: 'Top Products', propertyId: 'pp-price', width: 2, height: 2 },
        { id: 'w10', type: 'list', title: 'Recent Activity', width: 2, height: 2 },
      ],
    },
  },
  'v-prod-analytics': {
    id: 'v-prod-analytics', databaseId: DB_PRODUCTS, name: 'Analytics Dashboard', type: 'dashboard',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['pp-name', 'pp-category', 'pp-price', 'pp-cost', 'pp-stock', 'pp-rating', 'pp-shipping', 'pp-condition', 'pp-weight'],
    settings: {
      widgets: [
        { id: 'wa1', type: 'stat', title: 'Total Revenue', propertyId: 'pp-price', aggregation: 'sum', width: 1, height: 1 },
        { id: 'wa2', type: 'stat', title: 'Avg Cost', propertyId: 'pp-cost', aggregation: 'average', width: 1, height: 1 },
        { id: 'wa3', type: 'stat', title: 'Avg Weight', propertyId: 'pp-weight', aggregation: 'average', width: 1, height: 1 },
        { id: 'wa4', type: 'stat', title: 'Products', aggregation: 'count', width: 1, height: 1 },
        { id: 'wa5', type: 'chart', title: 'Category Breakdown', propertyId: 'pp-category', chartStyle: 'bar', aggregation: 'count', width: 2, height: 2 },
        { id: 'wa6', type: 'chart', title: 'Shipping Analysis', propertyId: 'pp-shipping', chartStyle: 'donut', aggregation: 'count', width: 2, height: 2 },
        { id: 'wa7', type: 'chart', title: 'Condition Overview', propertyId: 'pp-condition', chartStyle: 'progress', aggregation: 'count', width: 2, height: 2 },
        { id: 'wa8', type: 'chart', title: 'Category Trend', propertyId: 'pp-category', chartStyle: 'area', aggregation: 'count', width: 2, height: 2 },
        { id: 'wa8b', type: 'chart', title: 'Stock × Category Over Time', propertyId: 'pp-stock', chartStyle: 'multi_line', aggregation: 'count', width: 4, height: 2 },
        { id: 'wa9', type: 'chart', title: 'Price Metrics', propertyId: 'pp-price', chartStyle: 'number_grid', aggregation: 'sum', width: 2, height: 1 },
        { id: 'wa10', type: 'chart', title: 'Cost Metrics', propertyId: 'pp-cost', chartStyle: 'number_grid', aggregation: 'sum', width: 2, height: 1 },
        { id: 'wa11', type: 'chart', title: 'Condition Split', propertyId: 'pp-condition', chartStyle: 'stacked_bar', aggregation: 'count', width: 2, height: 1 },
        { id: 'wa12', type: 'chart', title: 'Shipping Distribution', propertyId: 'pp-shipping', chartStyle: 'horizontal_bar', aggregation: 'count', width: 2, height: 1 },
        { id: 'wa13', type: 'table', title: 'Price Rankings', propertyId: 'pp-price', width: 2, height: 2 },
        { id: 'wa14', type: 'list', title: 'Recent Activity', width: 2, height: 2 },
      ],
    },
  },
  'v-prod-formula-dash': {
    id: 'v-prod-formula-dash', databaseId: DB_PRODUCTS, name: 'Formula Analytics', type: 'dashboard',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: [
      'pp-name', 'pp-price', 'pp-cost', 'pp-margin', 'pp-margin-pct', 'pp-price-tier',
      'pp-weight-label', 'pp-days-listed', 'pp-warranty-ok', 'pp-profit-score',
      'pp-inv-value', 'pp-is-bargain', 'pp-price-per-kg', 'pp-deal-tag',
    ],
    settings: { formulaAnalytics: true },
  },
};
