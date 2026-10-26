/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useCellAnchor.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:16:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState, useEffect } from 'react';
import type React from 'react';

/**
 * Measures the bounding rect of the nearest ancestor `<td>` element, or of a
 * board/gallery card cell (`[data-cell-anchor]`) hosting the same editors.
 *
 * Cell editors portal themselves to `document.body` and must position
 * below the triggering cell. The measurement runs once on mount because
 * the `<td>` position is stable while the editor is open.
 *
 * @param ref - Ref attached to any element inside the target `<td>`.
 * @returns The anchor's `DOMRect`, or `null` if there is no anchor ancestor.
 */
export function useCellAnchor(
  ref: React.RefObject<HTMLElement | null>,
): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const td = ref.current.closest('td, [data-cell-anchor]');
    if (td) setRect(td.getBoundingClientRect());
  }, [ref]);

  return rect;
}
