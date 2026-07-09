/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useListHighlight.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Roving keyboard highlight for an option list inside a cell-editor popover.
 * ArrowDown/Up move the highlight (wrapping), the active row scrolls into view,
 * and `onArrowKey` reports whether it consumed the key so the caller can keep
 * its own Enter/Escape/create handling. One implementation for every editor
 * (select, multi-select, status, relation) so keyboard behavior stays uniform.
 */
export function useListHighlight(length: number) {
  const [index, setIndex] = useState(0);
  const activeRef = useRef<HTMLElement | null>(null);

  // Keep the highlight in range as the list filters/changes.
  useEffect(() => {
    setIndex(i => (length === 0 ? 0 : Math.min(Math.max(i, 0), length - 1)));
  }, [length]);

  // Scroll the highlighted row into view within its scroll container.
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest' }); }, [index]);

  const move = useCallback((delta: number) => {
    setIndex(i => (length === 0 ? 0 : (i + delta + length) % length));
  }, [length]);

  /** Handle Arrow up/down; returns true when the key was consumed. */
  const onArrowKey = useCallback((e: { key: string; preventDefault: () => void }): boolean => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); return true; }
    return false;
  }, [move]);

  return { index, setIndex, move, onArrowKey, activeRef };
}
