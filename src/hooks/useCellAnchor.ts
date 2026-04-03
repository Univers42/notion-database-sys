/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useCellAnchor.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState, useEffect } from 'react';
import type React from 'react';

/**
 * Measures the bounding rect of the nearest ancestor <td> element.
 * Used by all portal-based cell editors to position themselves below the cell.
 */
export function useCellAnchor(
  ref: React.RefObject<HTMLElement | null>,
): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const td = ref.current.closest('td');
    if (td) setRect(td.getBoundingClientRect());
  }, [ref]);

  return rect;
}
