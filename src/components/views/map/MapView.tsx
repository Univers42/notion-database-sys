/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MapView.tsx                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:43 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 00:12:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useRef, useMemo } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MARKER_COLORS, makeColorIcon, MapEmptyOverlay, MapLegend, MapSidebar, type MappablePage } from './MapHelpers';

// Fix default marker icon issue in bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

export function MapView() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView, openPage, getPageTitle, addPage } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const pages = useMemo(() => view ? getPagesForView(view.id) : [], [view, getPagesForView]);
  const settings = view?.settings || {};

  // Find the place property to use for mapping
  const placePropId = settings.mapBy
    || Object.values(database?.properties || {}).find(p => p.type === 'place')?.id;

  // Find a select property for coloring markers
  const categoryProp = Object.values(database?.properties || {}).find(
    p => p.type === 'select' && p.name.toLowerCase().includes('category')
  ) || Object.values(database?.properties || {}).find(p => p.type === 'select');

  // Gather map-ready pages (those with lat/lng)
  const mappablePages = useMemo(() => {
    if (!placePropId) return [];
    return pages
      .map(page => {
        const place = page.properties[placePropId];
        if (place && typeof place === 'object' && typeof place.lat === 'number' && typeof place.lng === 'number') {
          const catVal = categoryProp ? page.properties[categoryProp.id] : null;
          const catOpt = categoryProp?.options?.find(o => o.id === catVal);
          return { page, lat: place.lat, lng: place.lng, address: place.address || '', color: catOpt?.color };
        }
        return null;
      })
      .filter(Boolean) as MappablePage[];
  }, [pages, placePropId, categoryProp]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    // OpenStreetMap tiles — free, global, performant
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Small attribution bottom-right
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();

    if (mappablePages.length === 0) return;

    mappablePages.forEach(({ page, lat, lng, address, color }) => {
      const title = getPageTitle(page);
      const markerColor = color ? MARKER_COLORS[color] || 'var(--color-chart-1)' : 'var(--color-chart-1)';
      const icon = makeColorIcon(markerColor);

      const marker = L.marker([lat, lng], { icon }).addTo(markers);

      marker.bindPopup(`
        <div style="min-width:180px;font-family:system-ui,sans-serif;">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:var(--color-ink);">${page.icon ? page.icon + ' ' : ''}${title || 'Untitled'}</div>
          <div style="font-size:11px;color:var(--color-ink-secondary);margin-bottom:6px;">${address}</div>
          <button onclick="window.__mapOpenPage && window.__mapOpenPage('${page.id}')"
            style="font-size:11px;color:var(--color-accent);background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;">
            Open page →
          </button>
        </div>
      `, { closeButton: false, className: 'map-popup' });
    });

    // Fit bounds
    const bounds = L.latLngBounds(mappablePages.map(p => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
  }, [mappablePages, getPageTitle]);

  // Bridge for popup click → store
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__mapOpenPage = (pageId: string) => openPage(pageId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { delete (window as any).__mapOpenPage; };
  }, [openPage]);

  if (!view || !database) return null;

  const noPlaceProp = !placePropId;

  return (
    <div className="flex-1 flex overflow-hidden bg-surface-primary">
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {/* Empty state overlay */}
        {(noPlaceProp || mappablePages.length === 0) && (
          <MapEmptyOverlay noPlaceProp={noPlaceProp} pageCount={pages.length} />
        )}

        {/* Legend */}
        {categoryProp && mappablePages.length > 0 && (
          <MapLegend categoryProp={categoryProp} />
        )}

        {/* Count badge */}
        {mappablePages.length > 0 && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-overlay backdrop-blur border border-line rounded-full px-3 py-1.5 shadow text-xs text-ink-body-light font-medium">
            {mappablePages.length} location{mappablePages.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Sidebar list */}
      <MapSidebar mappablePages={mappablePages} pages={pages}
        getPageTitle={getPageTitle} openPage={openPage}
        addPage={addPage} databaseId={database.id} />
    </div>
  );
}
