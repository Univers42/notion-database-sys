/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useAnchoredFrame.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';
import { anchoredPanelFrame, VIEWPORT_MARGIN, type AnchoredFrame } from '../utils/geometry';

export type FittedFrame = AnchoredFrame & { width: number };

/**
 * Where a body-portaled panel hangs off its button, kept there while the page
 * scrolls or the window resizes, and never wider than the viewport. A panel
 * placed once stayed behind when its page scrolled; one wider than a phone ran
 * off its edge.
 */
export function useAnchoredFrame(
  anchorRef: React.RefObject<HTMLElement | null>,
  width: number,
  align: 'start' | 'end' = 'end',
): FittedFrame | null {
  const [frame, setFrame] = useState<FittedFrame | null>(null);
  // Callers often pass a fresh `{ current }` per render; keyed on it, placing
  // would re-subscribe on every render.
  const anchor = useRef(anchorRef);
  anchor.current = anchorRef;

  const place = useCallback(() => {
    const element = anchor.current.current;
    if (!element) return;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const fitted = Math.min(width, viewport.width - 2 * VIEWPORT_MARGIN);
    setFrame({ ...anchoredPanelFrame(element.getBoundingClientRect(), fitted, viewport, align), width: fitted });
  }, [width, align]);

  useLayoutEffect(() => {
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [place]);

  return frame;
}
