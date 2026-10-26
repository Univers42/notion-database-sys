/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AnchoredPopover.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 14:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 14:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Z } from '../../utils/geometry';
import { useAnchoredFrame } from '../../hooks/useAnchoredFrame';
import { cn } from '../../utils/cn';

// A toolbar panel (View settings, Sort) belongs to ONE database, so it opens
// as a popover pinned to the button that opened it, not docked to the app's
// edge. It follows the button on scroll/resize; it is not draggable. Portaled
// to body because it is placed with window coordinates: in place, a host pane
// (`contain: paint`) or layout cell (`transform`) became its containing block,
// shifting it by that box's offset and clipping it to that box, so next to a
// full-width database it ended up off the pane and out of sight.
export function AnchoredPopover({ anchorRef, label, width, onClose, children }: Readonly<{
  anchorRef: React.RefObject<HTMLElement | null>;
  label: string;
  width: number;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  const panelRef = useRef<HTMLDialogElement>(null);
  const frame = useAnchoredFrame(anchorRef, width, 'end', panelRef);
  // Callers pass an inline closure; keyed on it, the open/close effect below
  // would re-run (and refocus the button) on every parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    // A field that took focus on mount (the panel's search) keeps it.
    if (!panel?.contains(document.activeElement)) panel?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Focus goes back to the button only if closing lost it: a choice that
      // opened another field (picking a filter opens its value) keeps it there.
      // A panel still attached is StrictMode replaying this effect, not a close.
      const active = document.activeElement;
      if (!panel?.isConnected && (!active || active === document.body)) anchor?.focus();
    };
  }, [anchorRef]);

  // Unplaced, the panel is transparent rather than hidden: a hidden field
  // cannot take its autofocus, and placing happens before the first paint.
  return createPortal(
    <>
      <button type="button" tabIndex={-1} aria-label={`Close ${label.toLowerCase()}`} onClick={onClose}
        className={cn("fixed inset-0 appearance-none border-0 bg-transparent p-0 cursor-default")}
        style={{ zIndex: Z.DROPDOWN }} />
      <dialog open ref={panelRef} tabIndex={-1} aria-label={label}
        className={cn("fixed m-0 p-0 overflow-y-auto overflow-x-hidden bg-surface-primary border border-line rounded-xl shadow-xl outline-none")}
        style={{ zIndex: Z.DROPDOWN + 1, width: frame?.width ?? width, left: frame?.left ?? 0, top: frame?.top,
          bottom: frame?.bottom, maxHeight: frame?.maxHeight, opacity: frame ? 1 : 0 }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }}>{/* NOSONAR */}
        {children}
      </dialog>
    </>,
    document.body,
  );
}
