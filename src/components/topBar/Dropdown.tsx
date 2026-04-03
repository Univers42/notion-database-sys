/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Dropdown.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 17:11:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useRef } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { cn } from '../../utils/cn';

/** Generic dropdown wrapper with outside-click dismiss */
export function Dropdown({ children, onClose, className = '' }: Readonly<{
  children: React.ReactNode; onClose: () => void; className?: string;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, true, onClose);

  return (
    <div ref={ref}
      className={cn('absolute top-full left-0 mt-1 bg-surface-primary border border-line rounded-xl shadow-lg z-50 overflow-hidden', className)}>
      {children}
    </div>
  );
}
