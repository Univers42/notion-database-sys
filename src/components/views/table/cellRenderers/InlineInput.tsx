/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   InlineInput.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

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

// autoFocus leaves a textarea's caret at 0 in Chrome, so typing after Enter
// prepended to the value. setSelectionRange throws on email/number/date inputs.
const SELECTABLE_TYPES = new Set(['textarea', 'text', 'search', 'url', 'tel', 'password']);
function focusAtEnd(el: HTMLInputElement | HTMLTextAreaElement | null) {
  if (!el) return;
  el.focus();
  if (SELECTABLE_TYPES.has(el.type)) el.setSelectionRange(el.value.length, el.value.length);
}

// `block`: an inline-block editor sits on the text baseline and adds a
// descender gap, growing the row 35→39 px; every row below then shifts and the
// whole grid repaints on each edit open/commit (1294 paints, ~20 ms measured).
/** Inline input that buffers locally while the user types; commits on blur or
 *  Enter. `multiline` (title and text properties) renders a textarea instead: Shift+Enter
 *  inserts a newline and typing continues in the cell; plain Enter commits. */
export function InlineInput({ type = 'text', value, onChange, onStop, tableRef, className = '', placeholder = 'Empty', step, multiline = false }: Readonly<{
  type?: string; value: PropertyValue; onChange: (v: PropertyValue) => void; onStop: () => void;
  tableRef: React.RefObject<HTMLDivElement | null>; className?: string; placeholder?: string; step?: string; multiline?: boolean;
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

  if (multiline) {
    return (
      <textarea
        ref={focusAtEnd} value={local} rows={Math.min(local.split('\n').length, 8)}
        onChange={e => { committed.current = false; setLocal(e.target.value); }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); tableRef.current?.focus(); }
          if (e.key === 'Escape') { committed.current = true; onStop(); tableRef.current?.focus(); }
        }}
        // The cell's own frame already shows focus; the host's keyboard ring
        // drew a second box inside it.
        data-writing-surface
        className={cn(`block w-full bg-transparent outline-none text-sm resize-none ${className}`)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      ref={focusAtEnd} type={type} value={local} step={step}
      onChange={e => { committed.current = false; setLocal(e.target.value); }}
      onBlur={commit}
      onKeyDown={e => {
        // preventDefault, as in the textarea path: the page editor around an
        // inline database skips a claimed Enter, and an unclaimed one moved the
        // caret into a page paragraph right after the commit.
        if (e.key === 'Enter') { e.preventDefault(); commit(); tableRef.current?.focus(); }
        if (e.key === 'Escape') { committed.current = true; onStop(); tableRef.current?.focus(); }
      }}
      data-writing-surface
      className={cn(`block w-full bg-transparent outline-none text-sm ${className}`)}
      placeholder={placeholder}
    />
  );
}
