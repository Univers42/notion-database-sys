/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PortalDropdown.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredFrame } from '../../hooks/useAnchoredFrame';
import { cn } from '../../utils/cn';

/** CSS class overrides for PortalDropdown sub-elements. */
export type PortalDropdownSlots = {
  root: string;
};

/** Renders a portal-based dropdown that hangs off an anchor element and follows it. */
export function PortalDropdown({ anchorRef, children, onClose, width, align = 'left', slots }: Readonly<{
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
  align?: 'left' | 'right';
  slots?: Partial<PortalDropdownSlots>;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useAnchoredFrame(anchorRef, width || 220, align === 'right' ? 'end' : 'start', ref);
  // A menu opened from this one (the operator list inside a filter editor) is
  // portaled outside it in the DOM but still inside it in React, where the
  // press bubbles through here first. Without this flag, choosing an operator
  // closed the editor, and the menu with it, before the click landed.
  const pressedInside = useRef(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // The anchor toggles itself; closing here first would reopen it on click.
      const target = e.target as Node;
      const inside = pressedInside.current || ref.current?.contains(target) || anchorRef.current?.contains(target);
      pressedInside.current = false;
      if (!inside) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  // Rendered (transparent) before it is placed, so placing can read its
  // height and its field can take autofocus; placing precedes the first paint.
  return createPortal(
    <div ref={ref} onMouseDown={() => { pressedInside.current = true; }}
      onKeyDown={e => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        onClose();
        anchorRef.current?.focus();
      }}
      className={cn("fixed z-[9999] bg-surface-primary border border-line rounded-xl shadow-xl overflow-y-auto overflow-x-hidden", slots?.root)}
      style={{ top: frame?.top, bottom: frame?.bottom, left: frame?.left ?? 0, maxHeight: frame?.maxHeight,
        opacity: frame ? 1 : 0, ...(width ? { width: frame?.width ?? width } : {}) }}>
      {children}
    </div>,
    document.body
  );
}
