/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CellPortal.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:53 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 02:10:37 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function useCellRect(measureRef: React.RefObject<HTMLDivElement | null>) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (measureRef.current) {
      const td = measureRef.current.closest('td');
      if (td) setRect(td.getBoundingClientRect());
    }
  }, [measureRef]);
  return rect;
}

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
  const rect = useCellRect(measureRef);

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <button type="button" className="fixed inset-0 z-[9998] appearance-none border-0 bg-transparent p-0 cursor-default" onClick={e => { e.stopPropagation(); onClose(); }} tabIndex={-1} aria-label="Close" />
          <div
            role="dialog"
            aria-modal="true"
            className={`fixed bg-surface-primary shadow-xl border border-line rounded-lg z-[9999] overflow-hidden ${className}`}
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, minWidth), maxWidth, maxHeight }}
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
