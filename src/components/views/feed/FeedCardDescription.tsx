/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedCardDescription.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Inline-editable post description on a gallery/feed card. Uncontrolled textarea
 * (smooth typing) that auto-grows to its content and persists to a text property
 * on blur — only when the text actually changed. Every pointer/click/key event is
 * stopped so editing the description never opens the card's page or starts a
 * marquee selection.
 *
 * ponytail: shows the editor to any viewer; the server ACL (canEditPage) is the
 * real gate, so a read-only viewer's edit just won't persist across reload. Add a
 * canEdit prop + read-only <p> fallback if that ever confuses viewers.
 */

import React, { useCallback, useRef } from 'react';

import { cn } from '../../../utils/cn';

function autosize(el: HTMLTextAreaElement | null): void {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export function FeedCardDescription({ value, onCommit }: Readonly<{
  value: string;
  onCommit: (next: string) => void;
}>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const stop = useCallback((event: React.SyntheticEvent) => event.stopPropagation(), []);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
    const next = event.target.value.trim();
    if (next !== value.trim()) onCommit(next);
  }, [value, onCommit]);

  return (
    <textarea
      ref={(el) => { ref.current = el; autosize(el); }}
      key={value}
      defaultValue={value}
      rows={1}
      placeholder="Write a description…"
      aria-label="Post description"
      onClick={stop}
      onKeyDown={stop}
      onPointerDown={stop}
      onInput={(event) => autosize(event.currentTarget)}
      onBlur={handleBlur}
      className={cn('w-full resize-none overflow-hidden bg-transparent text-sm text-ink-body-light leading-relaxed outline-none placeholder:text-ink-muted')}
    />
  );
}
