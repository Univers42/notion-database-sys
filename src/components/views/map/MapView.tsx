/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MapView.tsx                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:43 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 20:16:39 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useRef, useMemo } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import type * as Leaflet from 'leaflet';
import { MARKER_COLORS, makeColorIcon, MapEmptyOverlay, MapLegend, MapSidebar, type MappablePage } from './MapHelpers';
import { cn } from '../../../utils/cn';

/** Renders a Leaflet-based map view with markers for geolocated database pages. */
export function MapView() {
  const [leaflet, setLeaflet] = React.useState<typeof Leaflet | null>(null);
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView, openPage, getPageTitle, addPage } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      if (cancelled) return;
      const defaultIcon = mod.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      mod.Marker.prototype.options.icon = defaultIcon;
      setLeaflet(mod);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Init map
  useEffect(() => {
    if (!leaflet || !mapContainerRef.current || mapRef.current) return;

    const map = leaflet.map(mapContainerRef.current, {
      center: [30, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    // OpenStreetMap tiles — free, global, performant
    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Zoom control top-right
    leaflet.control.zoom({ position: 'topright' }).addTo(map);

    // Small attribution bottom-right
    leaflet.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    markersRef.current = leaflet.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, [leaflet]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!leaflet || !map || !markers) return;

    markers.clearLayers();

    if (mappablePages.length === 0) return;

    mappablePages.forEach(({ page, lat, lng, address, color }) => {
      const title = getPageTitle(page);
      const markerColor = color ? MARKER_COLORS[color] || 'var(--color-chart-1)' : 'var(--color-chart-1)';
      const icon = makeColorIcon(leaflet, markerColor);

      const marker = leaflet.marker([lat, lng], { icon }).addTo(markers);

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
    const bounds = leaflet.latLngBounds(mappablePages.map(p => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
  }, [leaflet, mappablePages, getPageTitle]);

  // Bridge for popup click → store
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__mapOpenPage = (pageId: string) => openPage(pageId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { delete (globalThis as any).__mapOpenPage; };
  }, [openPage]);

  if (!view || !database) return null;

  const noPlaceProp = !placePropId;

  return (
    <div className={cn("flex-1 flex overflow-hidden bg-surface-primary")}>
      {/* Map */}
      <div className={cn("flex-1 relative")}>
        <div ref={mapContainerRef} className={cn("absolute inset-0 z-0")} />

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
          <div className={cn("absolute bottom-3 left-3 z-[1000] bg-overlay backdrop-blur border border-line rounded-full px-3 py-1.5 shadow text-xs text-ink-body-light font-medium")}>
            {mappablePages.length} location{mappablePages.length === 1 ? '' : 's'}
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
