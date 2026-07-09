// ─── PlaceCellEditor — location search (Nominatim/OSM) + current location ────
// Notion-model place picker: type to search addresses/cities/countries, pick a
// suggestion, or use the browser's location. Offline / no results → Enter
// keeps the typed address as-is (never blocks manual entry).

import React, { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
import type { PlaceValue, PropertyValue } from '../../types/database';
import { CellPortal } from './CellPortal';
import { cn } from '../../utils/cn';

interface PlaceSuggestion {
  label: string;
  detail: string;
  lat?: number;
  lng?: number;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';

async function searchPlaces(query: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const url = `${NOMINATIM}/search?format=jsonv2&limit=6&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) return [];
  const rows: { display_name: string; lat: string; lon: string; name?: string }[] = await response.json();
  return rows.map(row => ({
    label: row.name || row.display_name.split(',')[0],
    detail: row.display_name,
    lat: Number.parseFloat(row.lat),
    lng: Number.parseFloat(row.lon),
  }));
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(`${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const data: { display_name?: string } = await response.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

interface PlaceCellEditorProps {
  value: PropertyValue;
  onUpdate: (value: PropertyValue) => void;
  onClose: () => void;
}

export function PlaceCellEditor({ value, onUpdate, onClose }: Readonly<PlaceCellEditorProps>) {
  const initial = (typeof value === 'object' && value ? (value as PlaceValue).address : typeof value === 'string' ? value : '') ?? '';
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [locating, setLocating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed === initial) { setResults([]); setStatus('idle'); return; }
    setStatus('loading');
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = setTimeout(() => {
      searchPlaces(trimmed, controller.signal)
        .then(found => { setResults(found); setStatus('idle'); })
        .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pick = (place: PlaceValue) => { onUpdate(place); onClose(); };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;
        pick({ address: await reverseGeocode(latitude, longitude), lat: latitude, lng: longitude });
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <CellPortal onClose={onClose} minWidth={260}>
      <div className={cn("p-1.5 border-b border-line")}>
        <input
          autoFocus
          aria-label="Search locations"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;
            if (results.length > 0) pick({ address: results[0].detail, lat: results[0].lat, lng: results[0].lng });
            else if (query.trim()) pick({ address: query.trim() });
          }}
          placeholder="Search for a location…"
          className={cn("w-full px-2 py-1 text-sm bg-surface-secondary rounded-md outline-none text-ink placeholder:text-ink-muted")}
        />
      </div>
      <div className={cn("max-h-60 overflow-y-auto py-1")}>
        <button type="button" onClick={useCurrentLocation} disabled={locating}
          className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink-body hover:bg-hover-surface-soft2 disabled:opacity-50")}>
          <LocateFixed className={cn("w-3.5 h-3.5 text-ink-muted shrink-0")} />
          {locating ? 'Locating…' : 'Current location'}
        </button>
        {results.map(place => (
          <button key={`${place.detail}${place.lat}`} type="button"
            onClick={() => pick({ address: place.detail, lat: place.lat, lng: place.lng })}
            className={cn("w-full flex flex-col items-start gap-0 px-3 py-1.5 text-left hover:bg-hover-surface-soft2")}>
            <span className={cn("flex items-center gap-1.5 text-sm text-ink")}>
              <MapPin className={cn("w-3 h-3 text-ink-muted shrink-0")} />
              <span className={cn("truncate font-medium")}>{place.label}</span>
            </span>
            <span className={cn("pl-[18px] text-xs text-ink-muted truncate w-full")}>{place.detail}</span>
          </button>
        ))}
        {status === 'loading' && <div className={cn("px-3 py-2 text-xs text-ink-muted")}>Searching…</div>}
        {status === 'error' && <div className={cn("px-3 py-2 text-xs text-ink-muted")}>Search unavailable — Enter keeps the typed address.</div>}
      </div>
    </CellPortal>
  );
}
