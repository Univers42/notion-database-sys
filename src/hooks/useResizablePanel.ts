/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useResizablePanel.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:40:12 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:40:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// useResizablePanel — handles panel-resize logic for side/center peek modals
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ResizablePanelOptions {
  mode: 'side_peek' | 'center_peek' | 'full_page';
  defaultWidth: number;
  minWidth?: number;
  maxWidthRatio?: number;
}

interface ResizablePanelReturn {
  panelWidth: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent) => void;
}

const DEFAULT_WIDTHS: Record<string, number> = {
  side_peek: 672,
  center_peek: 768,
  full_page: 896,
};

const MIN_WIDTH = 400;
const MAX_WIDTH_RATIO = 0.92;

export function useResizablePanel(options?: Partial<ResizablePanelOptions>): ResizablePanelReturn {
  const mode = options?.mode ?? 'side_peek';
  const defaultW = options?.defaultWidth ?? DEFAULT_WIDTHS[mode] ?? 672;
  const minW = options?.minWidth ?? MIN_WIDTH;
  const maxRatio = options?.maxWidthRatio ?? MAX_WIDTH_RATIO;

  const [panelWidth, setPanelWidth] = useState(defaultW);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { startX, startW } = resizeRef.current;
      const maxW = window.innerWidth * maxRatio;

      if (mode === 'side_peek') {
        const newW = Math.min(Math.max(startW + (startX - e.clientX), minW), maxW);
        setPanelWidth(newW);
      } else if (mode === 'center_peek') {
        const delta = 2 * Math.abs(startX - e.clientX) * Math.sign(startX - e.clientX);
        const newW = Math.min(Math.max(startW + delta, minW), maxW);
        setPanelWidth(Math.abs(newW));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, mode, minW, maxRatio]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startW: panelWidth };
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth]);

  return { panelWidth, isResizing, startResize };
}

export { MIN_WIDTH, MAX_WIDTH_RATIO };
