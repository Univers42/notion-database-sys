/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ViewSettingsPopover.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 14:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 14:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { anchoredPanelFrame, PANEL_WIDTH, Z, type AnchoredFrame } from '../../utils/geometry';
import { cn } from '../../utils/cn';

// View settings belong to ONE database, so they open as a popover pinned to
// that database's settings button, not as a sheet docked to the app's edge.
// It follows the button on scroll/resize; it is not draggable. Rendered in
// place (no portal) so the database's scoped theme still applies.
const POPOVER_WIDTH = PANEL_WIDTH.SETTINGS + 2;

export function ViewSettingsPopover({ anchorRef, onClose, children }: Readonly<{
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  const panelRef = useRef<HTMLDialogElement>(null);
  const [frame, setFrame] = useState<AnchoredFrame | null>(null);
  // Callers pass an inline closure; keyed on it, the open/close effect below
  // would re-run (and refocus the button) on every parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setFrame(anchoredPanelFrame(anchor.getBoundingClientRect(), POPOVER_WIDTH,
      { width: window.innerWidth, height: window.innerHeight }));
  }, [anchorRef]);

  useLayoutEffect(() => {
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [place]);

  useEffect(() => {
    const anchor = anchorRef.current;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      anchor?.focus();
    };
  }, [anchorRef]);

  return (
    <>
      <button type="button" tabIndex={-1} aria-label="Close view settings" onClick={onClose}
        className={cn("fixed inset-0 appearance-none border-0 bg-transparent p-0 cursor-default")}
        style={{ zIndex: Z.DROPDOWN }} />
      <dialog open ref={panelRef} tabIndex={-1} aria-label="View settings"
        className={cn("fixed m-0 p-0 overflow-y-auto overflow-x-hidden bg-surface-primary border border-line rounded-xl shadow-xl outline-none")}
        style={{ zIndex: Z.DROPDOWN + 1, width: POPOVER_WIDTH, left: frame?.left ?? 0, top: frame?.top,
          bottom: frame?.bottom, maxHeight: frame?.maxHeight, visibility: frame ? 'visible' : 'hidden' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }}>{/* NOSONAR */}
        {children}
      </dialog>
    </>
  );
}
