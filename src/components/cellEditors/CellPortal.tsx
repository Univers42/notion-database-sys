/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CellPortal.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:53 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:05 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCellAnchor } from '../../hooks/useCellAnchor';
import { PortalBackdrop } from '../ui/PortalBackdrop';
import { Z } from '../../utils/geometry';
import { cn } from '../../utils/cn';

interface CellPortalProps {
  onClose: () => void;
  minWidth?: number;
  maxWidth?: number;
  maxHeight?: string;
  className?: string;
  children: React.ReactNode;
}

/** Shared portal wrapper: invisible measure div + backdrop + positioned panel */
export function CellPortal({ onClose, minWidth = 280, maxWidth, maxHeight = '70vh', className = '', children }: Readonly<CellPortalProps>) {
  const measureRef = useRef<HTMLDivElement>(null);
  const rect = useCellAnchor(measureRef);

  // Non-modal <dialog open> does not capture Escape, and Playwright (or a
  // focused page editor) often sends the key outside the dialog. Listen on
  // document so the files/select portals actually dismiss.
  useEffect(() => {
    if (!rect) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose, rect]);

  return (
    <>
      <div ref={measureRef} className={cn("w-full h-0")} />
      {rect && createPortal(
        <>
          <PortalBackdrop onClose={onClose} zIndex={Z.CELL_BACKDROP} />
          <dialog // NOSONAR - dialog requires event handlers for propagation control
            open
            className={cn("odb-pop-in fixed bg-surface-primary shadow-xl border border-line rounded-lg overflow-hidden", className)}
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, minWidth), maxWidth, maxHeight, zIndex: Z.CELL_EDITOR }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
            {children}
          </dialog>
        </>,
        document.body
      )}
    </>
  );
}
