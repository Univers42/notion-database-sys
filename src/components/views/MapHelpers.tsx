/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MapHelpers.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:43 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:57:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { MapPin, Plus, FileText, Layers } from 'lucide-react';
import L from 'leaflet';
import type { Page, SchemaProperty } from '../../types/database';

export type MappablePage = {
  page: Page;
  lat: number;
  lng: number;
  address: string;
  color?: string;
};

export const MARKER_COLORS: Record<string, string> = {
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

export function makeColorIcon(color: string) {
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

export function MapEmptyOverlay({ noPlaceProp, pageCount }: Readonly<{
  noPlaceProp: boolean;
  pageCount: number;
}>) {
  return (
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
              {pageCount} pages found, but none have latitude/longitude coordinates.
              Add <code className="text-xs bg-surface-tertiary px-1 py-0.5 rounded">lat</code> and <code className="text-xs bg-surface-tertiary px-1 py-0.5 rounded">lng</code> to your place values.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function MapLegend({ categoryProp }: Readonly<{ categoryProp: SchemaProperty }>) {
  return (
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
  );
}

export function MapSidebar({ mappablePages, pages, getPageTitle, openPage, addPage, databaseId }: Readonly<{
  mappablePages: MappablePage[];
  pages: Page[];
  getPageTitle: (page: Page) => string;
  openPage: (id: string) => void;
  addPage: (dbId: string) => void;
  databaseId: string;
}>) {
  return (
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
            <button type="button" key={page.id} onClick={() => openPage(page.id)}
              className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-hover-surface cursor-pointer border-b border-line-faint transition-colors group text-left w-full">
              <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: dotColor }} />
              <div className="overflow-hidden min-w-0">
                <div className="text-sm font-medium text-ink truncate">{title || 'Untitled'}</div>
                {address && <div className="text-xs text-ink-secondary truncate">{address}</div>}
              </div>
            </button>
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
        <button onClick={() => addPage(databaseId)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New page
        </button>
      </div>
    </div>
  );
}
