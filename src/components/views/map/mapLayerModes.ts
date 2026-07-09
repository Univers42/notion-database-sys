/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   mapLayerModes.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── mapLayerModes — Leaflet builders for cluster + bubble displays ─────────
// Pure-Leaflet (no plugins): clusters are screen-space groups that zoom into
// their bounds on click; bubbles are √-scaled circleMarkers, one honest
// circle per location with the record list in its popup.

import type * as Leaflet from 'leaflet';
import { clusterPoints, aggregateByLocation, bubbleRadius, escapeHtml } from './mapModes';
import type { MapModePoint, MapClusterGroup } from './mapModes';

// User text and ids are HTML-escaped: Leaflet renders bindPopup via innerHTML.
// Clicks route through the data attribute — MapView's container delegation
// resolves it per map instance (no shared global to clobber or inject into).
const openPageLink = (id: string, label: string) => `
  <button data-map-open-page="${escapeHtml(id)}"
    style="display:block;font-size:11px;color:var(--color-accent);background:none;border:none;padding:1px 0;cursor:pointer;text-decoration:underline;text-align:left;">
    ${escapeHtml(label || 'Untitled')} →
  </button>`;

function groupPopupHtml(group: MapClusterGroup, valueLabel?: string): string {
  const links = group.items.slice(0, 6).map(item => openPageLink(item.id, item.title)).join('');
  const more = group.items.length > 6 ? `<div style="font-size:10px;opacity:.7;">+${group.items.length - 6} more</div>` : '';
  return `
    <div style="min-width:170px;font-family:system-ui,sans-serif;">
      <div style="font-weight:600;font-size:12px;margin-bottom:4px;color:var(--color-ink);">
        ${group.items.length} record${group.items.length === 1 ? '' : 's'}${valueLabel ? ` · ${escapeHtml(valueLabel)}` : ''}
      </div>
      ${links}${more}
    </div>`;
}

/** Screen-space clusters: count discs that fly to their bounds on click. */
export function buildClusterLayer(
  leaflet: typeof Leaflet,
  map: Leaflet.Map,
  layer: Leaflet.LayerGroup,
  points: readonly MapModePoint[],
): void {
  const zoom = map.getZoom();
  const project = (lat: number, lng: number) => map.project([lat, lng], zoom);
  for (const group of clusterPoints(points, project)) {
    if (group.items.length === 1) {
      const only = group.items[0];
      const dot = leaflet.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;border:2.5px solid white;
          background:${only.color || 'var(--color-chart-1)'};box-shadow:0 1px 4px var(--color-marker-shadow);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      leaflet.marker([only.lat, only.lng], { icon: dot }).addTo(layer)
        .bindPopup(groupPopupHtml(group), { closeButton: false, className: 'map-popup' });
      continue;
    }
    const size = Math.min(54, 34 + group.items.length * 2);
    const icon = leaflet.divIcon({
      className: '',
      html: `<div data-map-cluster="${group.items.length}" style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:var(--color-accent);color:white;border:3px solid white;
        box-shadow:0 2px 8px var(--color-marker-shadow);
        display:flex;align-items:center;justify-content:center;
        font:600 ${size > 44 ? 14 : 12}px system-ui,sans-serif;">${group.items.length}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    const marker = leaflet.marker([group.lat, group.lng], { icon }).addTo(layer)
      .bindPopup(groupPopupHtml(group), { closeButton: false, className: 'map-popup' });
    // Records sharing one coordinate can never split apart — open the record
    // list instead of zooming into a dead end; spread clusters zoom to split.
    const degenerate = group.items.every(item =>
      Math.abs(item.lat - group.items[0].lat) < 1e-6 && Math.abs(item.lng - group.items[0].lng) < 1e-6);
    if (!degenerate) {
      marker.on('click', () => {
        marker.closePopup();
        const bounds = leaflet.latLngBounds(group.items.map(i => [i.lat, i.lng] as [number, number]));
        map.flyToBounds(bounds.pad(0.3), { maxZoom: Math.min(map.getZoom() + 3, 14) });
      });
    }
  }
}

/** Proportional circles: one per location, area tracking the weight. */
export function buildBubblesLayer(
  leaflet: typeof Leaflet,
  layer: Leaflet.LayerGroup,
  points: readonly MapModePoint[],
  formatWeight: (weight: number) => string,
): void {
  const groups = aggregateByLocation(points);
  const maxWeight = Math.max(...groups.map(g => g.weight), 0);
  for (const group of groups) {
    const color = group.items.find(i => i.color)?.color || 'var(--color-chart-1)';
    leaflet.circleMarker([group.lat, group.lng], {
      radius: bubbleRadius(group.weight, maxWeight),
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.35,
      className: 'map-bubble',
    }).addTo(layer)
      .bindPopup(groupPopupHtml(group, formatWeight(group.weight)), { closeButton: false, className: 'map-popup' });
  }
}
