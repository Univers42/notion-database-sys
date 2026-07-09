/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   HeatOverlay.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── HeatOverlay — dependency-free canvas heat layer for Leaflet ────────────
// simpleheat technique: draw grayscale radial blobs (alpha accumulates where
// points overlap), then recolor every pixel through a 256-entry gradient LUT.
// The canvas lives in the overlay pane and repaints on move/zoom, so it costs
// nothing while idle. Colors are canvas paint, not themed CSS.

import type * as Leaflet from 'leaflet';
import type { MapModePoint } from './mapModes';

const GRADIENT: [number, string][] = [
  [0.25, '#2f6bd8'],
  [0.55, '#3dbd6d'],
  [0.75, '#f2c94c'],
  [1.0, '#eb5757'],
];

export interface HeatHandle {
  setData(points: MapModePoint[], maxWeight: number): void;
  destroy(): void;
}

function buildPalette(): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [stop, color] of GRADIENT) gradient.addColorStop(stop, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 256);
  return ctx.getImageData(0, 0, 1, 256).data;
}

/** Mounts a heat canvas on the map; caller owns the lifecycle. */
export function createHeatOverlay(leaflet: typeof Leaflet, map: Leaflet.Map): HeatHandle {
  const canvas = document.createElement('canvas');
  canvas.dataset.mapHeat = 'true';
  canvas.style.pointerEvents = 'none';
  map.getPanes().overlayPane.appendChild(canvas);
  const palette = buildPalette();
  let data: MapModePoint[] = [];
  let max = 1;

  const redraw = () => {
    const size = map.getSize();
    // A collapsed pane yields a 0×N map; getImageData would throw on it.
    if (size.x < 1 || size.y < 1) return;
    canvas.width = size.x;
    canvas.height = size.y;
    // Pin the canvas to the current viewport inside the transformed pane.
    leaflet.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
    const ctx = canvas.getContext('2d');
    if (!ctx || data.length === 0) return;

    const radius = 34;
    for (const point of data) {
      const p = map.latLngToContainerPoint([point.lat, point.lng]);
      if (p.x < -radius || p.y < -radius || p.x > size.x + radius || p.y > size.y + radius) continue;
      const intensity = 0.35 + 0.65 * Math.min(1, point.weight / max);
      const blob = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, radius);
      blob.addColorStop(0, `rgba(0,0,0,${intensity})`);
      blob.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = blob;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // Colorize: alpha → palette row, keep alpha soft for map readability.
    const frame = ctx.getImageData(0, 0, size.x, size.y);
    const px = frame.data;
    for (let i = 0; i < px.length; i += 4) {
      const alpha = px[i + 3];
      if (alpha === 0) continue;
      const row = Math.min(255, alpha) * 4;
      px[i] = palette[row];
      px[i + 1] = palette[row + 1];
      px[i + 2] = palette[row + 2];
      px[i + 3] = Math.min(210, alpha + 40);
    }
    ctx.putImageData(frame, 0, 0);
  };

  map.on('moveend zoomend resize', redraw);
  return {
    setData(points, maxWeight) {
      data = points;
      max = Math.max(1, maxWeight);
      redraw();
    },
    destroy() {
      map.off('moveend zoomend resize', redraw);
      canvas.remove();
    },
  };
}
