/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedReactions.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * The reaction pills row (mirrors the channel MessageRow pattern) plus a "+"
 * SmilePlus button opening a searchable emoji popover. Emoji data reuses the
 * shared ui-collection set (a dependency, like date-fns — NOT an app module):
 * the full Discord-scale emoji list with categories + keywords. A post is
 * capped at 20 distinct emoji: the "+" disables at the cap; existing pills stay
 * toggleable. Escape / outside-click close the popover and return focus to "+".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { DEFAULT_EMOJI_PICKER_ITEMS } from '@univers42/ui-collection';

import { cn } from '../../../utils/cn';
import type { FeedReaction } from './useFeedReactions';

type EmojiItem = { id: string; value: string; label?: string; keywords?: string[]; group?: string };
const EMOJI_ITEMS = DEFAULT_EMOJI_PICKER_ITEMS as unknown as EmojiItem[]; // `value` is the glyph
const RENDER_CAP = 96; // keep the popover light; search reaches the long tail
const DISTINCT_CAP = 20;

function matchEmoji(item: EmojiItem, needle: string): boolean {
  return `${item.label ?? ''} ${item.id} ${(item.keywords ?? []).join(' ')} ${item.group ?? ''}`.toLowerCase().includes(needle);
}

function FeedReactionPicker({ onPick, onClose }: Readonly<{ onPick: (emoji: string) => void; onClose: () => void }>) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const results = (needle ? EMOJI_ITEMS.filter((item) => matchEmoji(item, needle)) : EMOJI_ITEMS).slice(0, RENDER_CAP);

  return (
    <div
      role="dialog"
      aria-label="Choose a reaction"
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}
      className={cn('absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-line bg-surface-primary p-2 shadow-lg')}
    >
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search emoji…"
        aria-label="Search emoji"
        className={cn('mb-2 w-full rounded-lg border border-line bg-surface-secondary px-2 py-1 text-sm outline-none focus:border-accent')}
      />
      <div className={cn('grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto')}>
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label ?? item.id}
            aria-label={`React with ${item.label ?? item.id}`}
            onClick={() => onPick(item.value)}
            className={cn('rounded-md p-1 text-lg leading-none hover:bg-hover-surface2')}
          >
            {item.value}
          </button>
        ))}
        {results.length === 0 && <p className={cn('col-span-8 py-3 text-center text-xs text-ink-muted')}>No emoji found</p>}
      </div>
    </div>
  );
}

export function FeedReactionBar({ reactions, onToggle, disabled }: Readonly<{
  reactions: FeedReaction[] | null;
  onToggle: (emoji: string) => void;
  disabled?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pills = reactions ?? [];
  const atCap = pills.length >= DISTINCT_CAP;

  const close = useCallback(() => { setOpen(false); triggerRef.current?.focus(); }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent) => {
      const node = event.target as Node;
      if (popRef.current?.contains(node) || triggerRef.current?.contains(node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className={cn('relative flex flex-wrap items-center gap-1')}>
      {pills.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          aria-pressed={reaction.mine}
          disabled={disabled}
          aria-label={`${reaction.emoji}, ${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}${reaction.mine ? ', you reacted' : ''}`}
          onClick={() => onToggle(reaction.emoji)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-colors disabled:opacity-50',
            reaction.mine ? 'border-accent bg-accent-soft text-accent-text' : 'border-line-light text-ink-secondary hover:bg-hover-surface2',
          )}
        >
          <span aria-hidden>{reaction.emoji}</span>
          <span className={cn('text-xs tabular-nums')}>{reaction.count}</span>
        </button>
      ))}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Add a reaction"
        disabled={disabled || atCap}
        title={atCap ? 'Reaction limit reached (20 distinct emoji)' : 'Add a reaction'}
        onClick={() => setOpen((value) => !value)}
        className={cn('flex items-center rounded-full border border-line-light p-1 text-ink-muted hover:bg-hover-surface2 disabled:opacity-40')}
      >
        <SmilePlus className={cn('h-4 w-4')} />
      </button>
      {open && (
        <div ref={popRef}>
          <FeedReactionPicker onPick={(emoji) => { if (!pills.find((p) => p.emoji === emoji)?.mine) onToggle(emoji); close(); }} onClose={close} />
        </div>
      )}
    </div>
  );
}
