/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   InlineInput.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:45 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 10:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { PropertyValue } from '../../../../types/database';
import { cn } from '../../../../utils/cn';
import { safeString } from '../../../../utils/safeString';

/** Inline input that buffers locally while the user types; commits on blur or Enter. */
export function InlineInput({ type = 'text', value, onChange, onStop, tableRef, className = '', placeholder = 'Empty', step }: Readonly<{
  type?: string; value: PropertyValue; onChange: (v: PropertyValue) => void; onStop: () => void;
  tableRef: React.RefObject<HTMLDivElement | null>; className?: string; placeholder?: string; step?: string;
}>) {
  const [local, setLocal] = useState<string>(safeString(value));
  const committed = useRef(false);

  // Sync from parent if value changes while NOT focused (e.g., undo/redo)
  useEffect(() => { setLocal(safeString(value)); }, [value]);

  const commit = useCallback(() => {
    if (committed.current) return;
    committed.current = true;
    let out: PropertyValue;
    if (type === 'number') out = local ? Number(local) : null;
    else out = local;
    onChange(out);
    onStop();
  }, [local, type, onChange, onStop]);

  return (
    <input
      autoFocus type={type} value={local} step={step}
      onChange={e => { committed.current = false; setLocal(e.target.value); }}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { commit(); tableRef.current?.focus(); }
        if (e.key === 'Escape') { committed.current = true; onStop(); tableRef.current?.focus(); }
      }}
      className={cn(`w-full bg-transparent outline-none text-sm ${className}`)}
      placeholder={placeholder}
    />
  );
}
