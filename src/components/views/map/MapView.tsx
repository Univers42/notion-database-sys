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

// h-[560px] gives the view an intrinsic height in unbounded contexts (a
// database embedded in a document) — without it the sidebar list defines the
// height and grows unbounded instead of scrolling; flex-1/min-h-0 still let
// bounded panes size it exactly.

import React, { useEffect, useRef, useMemo } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import type * as Leaflet from 'leaflet';
import { MARKER_COLORS, makeColorIcon, MapEmptyOverlay, MapLegend, MapSidebar, type MappablePage } from './MapHelpers';
import { buildClusterLayer, buildBubblesLayer } from './mapLayerModes';
import { createHeatOverlay, type HeatHandle } from './HeatOverlay';
import { MAP_MODE_LABEL, escapeHtml, type MapDisplayMode, type MapModePoint } from './mapModes';
import { cn } from '../../../utils/cn';
import { useViewPages } from '../../../hooks/useViewPages';
import { useGeocode } from '../../../store/live/placeGeocode';

/** Renders a Leaflet-based map view with markers for geolocated database pages. */
export function MapView() {
  const [leaflet, setLeaflet] = React.useState<typeof Leaflet | null>(null);
  const activeViewId = useActiveViewId();
  // Narrow selectors: a bare useDatabaseStore() re-rendered the map (and reset
  // its viewport) on EVERY store write anywhere in this database.
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const openPage = useDatabaseStore(s => s.openPage);
  const getPageTitle = useDatabaseStore(s => s.getPageTitle);
  const addPage = useDatabaseStore(s => s.addPage);
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
  const pinsByPageRef = useRef<Record<string, Leaflet.LeafletMarker>>({});
  const heatRef = useRef<HeatHandle | null>(null);
  // Refit the viewport only when the SET of coordinates changes — never on
  // unrelated re-renders (a fitBounds mid-session snaps the user's pan/zoom).
  const boundsSigRef = useRef('');
  const openPageRef = useRef(openPage);
  openPageRef.current = openPage;

  const pages = useViewPages(view?.id);
  const settings = view?.settings || {};
  const mode: MapDisplayMode = settings.mapDisplayMode ?? 'pins';
  const sizeById = settings.mapSizeBy || undefined;

  // Find the place property to use for mapping
  const placePropId = settings.mapBy
    || Object.values(database?.properties || {}).find(p => p.type === 'place')?.id;
  // Resolve mapSizeBy defensively: a deleted/re-typed property falls back to
  // counting records instead of silently zeroing every weight.
  const sizePropRaw = sizeById ? database?.properties?.[sizeById] : undefined;
  const sizeProp = sizePropRaw?.type === 'number' ? sizePropRaw : undefined;

  // Find a select property for coloring markers
  const categoryProp = Object.values(database?.properties || {}).find(
    p => p.type === 'select' && p.name.toLowerCase().includes('category')
  ) || Object.values(database?.properties || {}).find(p => p.type === 'select');

  // Place names present but lacking offline coordinates → geocode online (cached,
  // so the Map view can plot any city/country/region/address in the world).
  const pendingAddresses = useMemo(() => {
    if (!placePropId) return [] as string[];
    const names: string[] = [];
    for (const page of pages) {
      const place = page.properties[placePropId] as { lat?: unknown; address?: unknown } | null;
      if (place && typeof place === 'object' && typeof place.lat !== 'number'
        && typeof place.address === 'string' && place.address.trim()) {
        names.push(place.address);
      }
    }
    return names;
  }, [pages, placePropId]);
  const geocoded = useGeocode(pendingAddresses);

  // Gather map-ready pages: offline coordinates first, else the online-geocoded fallback.
  const mappablePages = useMemo(() => {
    if (!placePropId) return [];
    return pages
      .map(page => {
        const place = page.properties[placePropId] as { lat?: unknown; lng?: unknown; address?: unknown } | null;
        if (!place || typeof place !== 'object') return null;
        let lat = typeof place.lat === 'number' ? place.lat : undefined;
        let lng = typeof place.lng === 'number' ? place.lng : undefined;
        const address = typeof place.address === 'string' ? place.address : '';
        if (lat === undefined && address.trim()) {
          const hit = geocoded[address.trim().toLowerCase()];
          if (hit) { lat = hit[0]; lng = hit[1]; }
        }
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        const catVal = categoryProp ? page.properties[categoryProp.id] : null;
        const catOpt = categoryProp?.options?.find(o => o.id === catVal);
        return { page, lat, lng, address, color: catOpt?.color };
      })
      .filter(Boolean) as MappablePage[];
  }, [pages, placePropId, categoryProp, geocoded]);

  // Weighted points for the display modes (weight = size-by number, else 1).
  const points = useMemo<MapModePoint[]>(() => mappablePages.map(mp => ({
    id: mp.page.id,
    lat: mp.lat,
    lng: mp.lng,
    weight: sizeProp ? Math.max(0, Number(mp.page.properties[sizeProp.id]) || 0) : 1,
    title: getPageTitle(mp.page) || 'Untitled',
    color: mp.color ? MARKER_COLORS[mp.color] : undefined,
  })), [mappablePages, sizeProp, getPageTitle]);

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      if (cancelled) return;
      setLeaflet(mod);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Init map
  useEffect(() => {
    if (!leaflet || !mapContainerRef.current || mapRef.current) return;
    const map = leaflet.map(mapContainerRef.current, {
      center: [30, 0], zoom: 2, zoomControl: false, attributionControl: false,
    });
    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    leaflet.control.zoom({ position: 'topright' }).addTo(map);
    leaflet.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);
    markersRef.current = leaflet.layerGroup().addTo(map);
    mapRef.current = map;
    // Per-instance popup click delegation: popup HTML carries the page id in
    // a data attribute (escaped) — no shared global for other maps to clobber
    // and no inline onclick for a crafted id to break out of.
    const container = mapContainerRef.current;
    const onPopupClick = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-map-open-page]');
      const pageId = target?.dataset.mapOpenPage;
      if (pageId) openPageRef.current(pageId);
    };
    container.addEventListener('click', onPopupClick);
    return () => {
      container.removeEventListener('click', onPopupClick);
      heatRef.current?.destroy();
      heatRef.current = null;
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, [leaflet]);

  // Render the active display mode.
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!leaflet || !map || !markers) return;

    const render = () => {
      markers.clearLayers();
      pinsByPageRef.current = {};
      if (points.length === 0) return;
      if (mode === 'clusters') {
        buildClusterLayer(leaflet, map, markers, points);
      } else if (mode === 'bubbles') {
        buildBubblesLayer(leaflet, markers, points,
          w => (sizeProp ? `${sizeProp.name}: ${w}` : `${w}`));
      } else if (mode === 'pins') {
        mappablePages.forEach(({ page, lat, lng, address, color }) => {
          const title = getPageTitle(page);
          const markerColor = color ? MARKER_COLORS[color] || 'var(--color-chart-1)' : 'var(--color-chart-1)';
          const marker = leaflet.marker([lat, lng], { icon: makeColorIcon(leaflet, markerColor) }).addTo(markers);
          marker.bindPopup(`
            <div style="min-width:180px;font-family:system-ui,sans-serif;">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:var(--color-ink);">${escapeHtml(page.icon ? page.icon + ' ' : '')}${escapeHtml(title || 'Untitled')}</div>
              <div style="font-size:11px;color:var(--color-ink-secondary);margin-bottom:6px;">${escapeHtml(address)}</div>
              <button data-map-open-page="${escapeHtml(page.id)}"
                style="font-size:11px;color:var(--color-accent);background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;">
                Open page →
              </button>
            </div>
          `, { closeButton: false, className: 'map-popup' });
          pinsByPageRef.current[page.id] = marker;
        });
      }
    };

    heatRef.current?.destroy();
    heatRef.current = null;
    if (mode === 'heat') {
      heatRef.current = createHeatOverlay(leaflet, map);
      heatRef.current.setData([...points], Math.max(...points.map(p => p.weight), 1));
      markers.clearLayers();
      pinsByPageRef.current = {};
    } else {
      render();
    }
    // Clusters merge/split with zoom; bounds-fitting stays data-driven only.
    if (mode === 'clusters') map.on('zoomend', render);
    const signature = points.map(p => `${p.lat},${p.lng}`).sort().join(';');
    if (points.length > 0 && signature !== boundsSigRef.current) {
      boundsSigRef.current = signature;
      const bounds = leaflet.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
    return () => { if (mode === 'clusters') map.off('zoomend', render); };
  }, [leaflet, points, mappablePages, mode, sizeProp, getPageTitle]);

  if (!view || !database) return null;

  const noPlaceProp = !placePropId;
  const focusLocation = (mp: MappablePage) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([mp.lat, mp.lng], Math.max(map.getZoom(), 8), { duration: 0.7 });
    const pin = pinsByPageRef.current[mp.page.id];
    if (pin) map.once('moveend', () => pin.openPopup());
  };

  return (
    <div className={cn("flex-1 flex min-h-0 h-[560px] max-h-full overflow-hidden bg-surface-primary")}>
      {/* Map */}
      <div className={cn("flex-1 relative min-w-0")}>
        <div ref={mapContainerRef} className={cn("absolute inset-0 z-0")} />
        {(noPlaceProp || mappablePages.length === 0) && (
          <MapEmptyOverlay noPlaceProp={noPlaceProp} pageCount={pages.length} />
        )}
        {categoryProp && mappablePages.length > 0 && mode !== 'heat' && (
          <MapLegend categoryProp={categoryProp} />
        )}
        {mappablePages.length > 0 && (
          <div className={cn("absolute bottom-3 left-3 z-[1000] bg-overlay backdrop-blur border border-line rounded-full px-3 py-1.5 shadow text-xs text-ink-body-light font-medium")}>
            {mappablePages.length} location{mappablePages.length === 1 ? '' : 's'}
            {mode !== 'pins' && ` · ${MAP_MODE_LABEL[mode]}`}
            {(mode === 'heat' || mode === 'bubbles') && sizeProp && ` by ${sizeProp.name}`}
          </div>
        )}
      </div>

      {/* Sidebar list — bounded to the map height, scrolls on its own. */}
      <MapSidebar mappablePages={mappablePages} pages={pages}
        getPageTitle={getPageTitle} openPage={openPage} onFocus={focusLocation}
        addPage={addPage} databaseId={database.id} />
    </div>
  );
}
