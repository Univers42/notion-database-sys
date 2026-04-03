/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CellPortal.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:53 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:46 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCellAnchor } from '../../hooks/useCellAnchor';
import { PortalBackdrop } from '../ui/PortalBackdrop';
import { Z } from '../../utils/geometry';

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

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <PortalBackdrop onClose={onClose} zIndex={Z.CELL_BACKDROP} />
          <div
            role="dialog"
            aria-modal="true"
            className={`fixed bg-surface-primary shadow-xl border border-line rounded-lg overflow-hidden ${className}`}
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, minWidth), maxWidth, maxHeight, zIndex: Z.CELL_EDITOR }}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
            {children}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
