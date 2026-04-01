import React, { useEffect, useRef, useMemo } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useActiveViewId } from '../../hooks/useDatabaseScope';
import { MapPin, Plus, FileText, Layers } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Category color mapping for markers
const MARKER_COLORS: Record<string, string> = {
  'bg-accent-muted text-accent-text-bold': 'var(--color-chart-1)',
  'bg-pink-surface-muted text-pink-text-tag': 'var(--color-chart-3)',
  'bg-amber-surface-muted text-amber-text-tag': 'var(--color-chart-4)',
  'bg-indigo-surface-muted text-indigo-text-tag': 'var(--color-chart-8)',
  'bg-success-surface-muted text-success-text-tag': 'var(--color-progress-high)',
  'bg-rose-surface-muted text-rose-text-tag': 'var(--color-rose)',
  'bg-orange-surface-muted text-orange-text-tag': 'var(--color-chart-10)',
  'bg-purple-surface-muted text-purple-text-tag': 'var(--color-purple)',
  'bg-surface-muted text-ink-strong': 'var(--color-chart-label)',
  'bg-emerald-surface-muted text-emerald-text-tag': 'var(--color-chart-5)',
};

function makeColorIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;background:${color};
      border:3px solid white;box-shadow:0 2px 6px var(--color-marker-shadow);
      display:flex;align-items:center;justify-content:center;
    "><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export function MapView() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView, openPage, getPageTitle, addPage } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const pages = view ? getPagesForView(view.id) : [];
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
          const catOpt = categoryProp?.options?.find((o: any) => o.id === catVal);
          return { page, lat: place.lat, lng: place.lng, address: place.address || '', color: catOpt?.color };
        }
        return null;
      })
      .filter(Boolean) as { page: any; lat: number; lng: number; address: string; color?: string }[];
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
    (window as any).__mapOpenPage = (pageId: string) => openPage(pageId);
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
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-overlay-medium backdrop-blur-sm">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-accent-text-faint" />
              </div>
              {noPlaceProp ? (
                <>
                  <h3 className="text-base font-semibold text-ink-body mb-1">No location property</h3>
                  <p className="text-sm text-ink-secondary">Add a <strong>place</strong> property with latitude and longitude to see markers on the map.</p>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-ink-body mb-1">No geolocated pages</h3>
                  <p className="text-sm text-ink-secondary">
                    {pages.length} pages found, but none have latitude/longitude coordinates.
                    Add <code className="text-xs bg-surface-tertiary px-1 py-0.5 rounded">lat</code> and <code className="text-xs bg-surface-tertiary px-1 py-0.5 rounded">lng</code> to your place values.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        {categoryProp && mappablePages.length > 0 && (
          <div className="absolute top-3 left-3 z-[1000] bg-overlay backdrop-blur border border-line rounded-lg p-3 shadow-lg max-w-[200px]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-body mb-2">
              <Layers className="w-3.5 h-3.5" /> {categoryProp.name}
            </div>
            <div className="flex flex-col gap-1.5">
              {categoryProp.options?.map(opt => (
                <div key={opt.id} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: MARKER_COLORS[opt.color] || 'var(--color-chart-label)' }} />
                  <span className="text-[11px] text-ink-body-light truncate">{opt.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Count badge */}
        {mappablePages.length > 0 && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-overlay backdrop-blur border border-line rounded-full px-3 py-1.5 shadow text-xs text-ink-body-light font-medium">
            {mappablePages.length} location{mappablePages.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Sidebar list */}
      <div className="w-72 border-l border-line flex flex-col bg-surface-primary shrink-0">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-body">Locations</h3>
          <span className="text-xs text-ink-muted tabular-nums">{mappablePages.length}</span>
        </div>
        <div className="flex-1 overflow-auto">
          {mappablePages.map(({ page, address, color }) => {
            const title = getPageTitle(page);
            const dotColor = color ? MARKER_COLORS[color] || 'var(--color-chart-1)' : 'var(--color-chart-1)';
            return (
              <div key={page.id} onClick={() => openPage(page.id)}
                className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-hover-surface cursor-pointer border-b border-line-faint transition-colors group">
                <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: dotColor }} />
                <div className="overflow-hidden min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{title || 'Untitled'}</div>
                  {address && <div className="text-xs text-ink-secondary truncate">{address}</div>}
                </div>
              </div>
            );
          })}
          {mappablePages.length === 0 && pages.length > 0 && (
            <div className="text-center py-8 text-ink-muted px-4">
              <MapPin className="w-5 h-5 mx-auto mb-2 text-ink-disabled" />
              <p className="text-xs">Pages exist but have no coordinates</p>
            </div>
          )}
          {pages.length === 0 && (
            <div className="text-center py-8 text-ink-muted px-4">
              <FileText className="w-5 h-5 mx-auto mb-2 text-ink-disabled" />
              <p className="text-xs">No pages</p>
            </div>
          )}
        </div>
        <div className="border-t border-line p-2">
          <button onClick={() => addPage(database.id)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New page
          </button>
        </div>
      </div>
    </div>
  );
}
