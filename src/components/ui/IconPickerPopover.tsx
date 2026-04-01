import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { IconPicker as IconPickerPanel } from './IconPicker';
import type { IconPickerProps } from './IconPicker';

// ═══════════════════════════════════════════════════════════════════════════════
// Portal-based popover wrapper — anchors to a trigger element
// ═══════════════════════════════════════════════════════════════════════════════

interface IconPickerPopoverProps extends IconPickerProps {
  /** The anchor element ref to position near */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Preferred horizontal alignment */
  align?: 'left' | 'right';
}

export function IconPickerPopover({
  anchorRef,
  align = 'left',
  ...pickerProps
}: IconPickerPopoverProps) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 380, height: 340 });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute position on mount and window resize
  useEffect(() => {
    const compute = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 8;

      // Responsive size
      const w = Math.max(260, Math.min(400, vw - pad * 2));
      const h = Math.max(200, Math.min(380, vh - pad * 2));

      // Vertical: prefer below anchor
      let top = rect.bottom + 4;
      if (top + h > vh - pad) {
        top = rect.top - h - 4;
        if (top < pad) top = Math.max(pad, (vh - h) / 2);
      }

      // Horizontal
      let left: number;
      if (align === 'right') {
        left = rect.right - w;
        if (left < pad) left = pad;
      } else {
        left = rect.left;
        if (left + w > vw - pad) left = vw - pad - w;
        if (left < pad) left = pad;
      }

      setPos({ top, left, width: w, height: h });
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [anchorRef, align]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        pickerProps.onClose?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerProps.onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') pickerProps.onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pickerProps.onClose]);

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[9999]"
      style={{ top: pos.top, left: pos.left, width: pos.width, height: pos.height }}
    >
      <IconPickerPanel {...pickerProps} />
    </div>,
    document.body
  );
}
