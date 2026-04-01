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
export function CellPortal({ onClose, minWidth = 280, maxWidth, maxHeight = '70vh', className = '', children }: CellPortalProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const rect = useCellRect(measureRef);

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={e => { e.stopPropagation(); onClose(); }} />
          <div
            className={`fixed bg-surface-primary shadow-xl border border-line rounded-lg z-[9999] overflow-hidden ${className}`}
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, minWidth), maxWidth, maxHeight }}
            onClick={e => e.stopPropagation()}>
            {children}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
