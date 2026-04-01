/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PortalDropdown.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:22 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Portal dropdown — renders content at body level to avoid z-index clipping
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function PortalDropdown({ anchorRef, children, onClose, width, align = 'left' }: {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
  align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: align === 'right' ? rect.right - (width || 220) : rect.left,
    });
  }, [anchorRef, width, align]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!pos) return null;

  return createPortal(
    <div ref={ref}
      className="fixed z-[9999] bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden"
      style={{ top: pos.top, left: pos.left, ...(width ? { width } : {}) }}>
      {children}
    </div>,
    document.body
  );
}
