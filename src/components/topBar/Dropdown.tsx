/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Dropdown.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:49 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useRef } from 'react';

/** Outside-click handler — closes when clicking outside the ref element */
export function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active, onClose, ref]);
}

/** Generic dropdown wrapper with outside-click dismiss */
export function Dropdown({ children, onClose, className = '' }: {
  children: React.ReactNode; onClose: () => void; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, true, onClose);

  return (
    <div ref={ref}
      className={`absolute top-full left-0 mt-1 bg-surface-primary border border-line rounded-xl shadow-lg z-50 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
