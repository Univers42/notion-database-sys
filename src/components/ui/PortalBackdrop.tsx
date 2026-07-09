/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PortalBackdrop.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Z } from '../../utils/geometry';
import { cn } from '../../utils/cn';

interface PortalBackdropProps {
  onClose: () => void;
  zIndex?: number;
  className?: string;
}

/**
 * Invisible fullscreen button that closes a portal.
 * Place this BEFORE the panel in the portal so the panel renders on top.
 * Closes on POINTERDOWN, not click: a click can be lost when the panel's
 * focused input blurs and triggers a store write that re-renders between
 * mousedown and mouseup — the stuck-backdrop bug class.
 */
export function PortalBackdrop({ onClose, zIndex = Z.CELL_BACKDROP, className }: Readonly<PortalBackdropProps>) {
  return (
    <button
      type="button"
      className={cn('fixed inset-0 appearance-none border-0 bg-transparent p-0 cursor-default', className)}
      style={{ zIndex }}
      onPointerDown={e => { e.stopPropagation(); onClose(); }}
      tabIndex={-1}
      aria-label="Close"
    />
  );
}
