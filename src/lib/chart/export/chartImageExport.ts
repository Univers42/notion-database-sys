/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartImageExport.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * SVG → file helpers for chart export. Both render engines emit an <svg>
 * into the chart container (recharts natively, echarts via SVGRenderer), so
 * one serialization path covers PNG and SVG with no extra dependency:
 * XMLSerializer for the vector file, Image+canvas (2x) for the raster.
 */

/** Serialized standalone SVG markup (xmlns + explicit size injected). */
export function svgNodeToString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!clone.getAttribute('width')) clone.setAttribute('width', String(Math.round(rect.width)));
  if (!clone.getAttribute('height')) clone.setAttribute('height', String(Math.round(rect.height)));
  return new XMLSerializer().serializeToString(clone);
}

/** Rasterizes SVG markup to a PNG blob at `scale`× (white background). */
export function rasterizeSvgString(markup: string, width: number, height: number, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('canvas 2d context unavailable'));
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
    };
    image.onerror = () => reject(new Error('SVG rasterization failed'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

/** Triggers a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
