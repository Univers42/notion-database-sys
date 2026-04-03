/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useOutsideClick.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useEffect } from 'react';
import type React from 'react';

/**
 * Calls onClose when a mousedown event occurs outside the referenced element.
 * @param ref     - ref to the container element to watch
 * @param active  - set to false to disable the listener (e.g. when the panel is closed)
 * @param onClose - callback to invoke on outside click
 */
export function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active, ref, onClose]);
}
