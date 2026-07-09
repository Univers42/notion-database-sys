/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedShareMenu.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Share button + menu. Three REAL deliveries (chosen per share): copy link,
 * share to your profile (surfaced on your profile), and share to a DM — which
 * opens a recipient picker (your connections) and delivers the post as a live
 * direct message. Each flashes a transient confirmation; shows the running
 * share count when > 0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Share2, Link2, UserPlus, Send, ArrowLeft } from 'lucide-react';

import { cn } from '../../../utils/cn';
import { feedFetch } from './feedBridge';
import type { FeedShareResult, FeedShareTarget } from './useFeedInteractions';

const ITEMS: { target: FeedShareTarget; label: string; done: string; Icon: typeof Share2 }[] = [
  { target: 'link', label: 'Copy link', done: 'Copied!', Icon: Link2 },
  { target: 'profile', label: 'Share to profile', done: 'Shared to your profile', Icon: UserPlus },
  { target: 'dm', label: 'Share to a DM', done: 'Sent', Icon: Send },
];

type Person = { id: string; name: string; avatar: string | null };

/** Recipient list for share-to-DM: the caller's accepted connections. */
function DmRecipients({ onPick, onBack }: Readonly<{ onPick: (id: string) => void; onBack: () => void }>) {
  const [people, setPeople] = useState<Person[] | null>(null);
  useEffect(() => {
    let alive = true;
    void feedFetch<{ connections?: { peer: Person }[] }>('GET', '/api/connections?status=accepted').then((reply) => {
      if (alive) setPeople((reply?.connections ?? []).map((edge) => edge.peer).filter((peer) => peer?.id));
    });
    return () => { alive = false; };
  }, []);
  return (
    <div>
      <button type="button" onClick={onBack} className={cn('mb-1 flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-ink-muted hover:bg-hover-surface2')}>
        <ArrowLeft className={cn('h-3.5 w-3.5')} /> Send to…
      </button>
      <div className={cn('max-h-56 overflow-y-auto')}>
        {people === null && <p className={cn('px-3 py-3 text-center text-xs text-ink-muted')}>Loading…</p>}
        {people?.length === 0 && <p className={cn('px-3 py-3 text-center text-xs text-ink-muted')}>No connections yet.</p>}
        {people?.map((person) => (
          <button key={person.id} type="button" onClick={() => onPick(person.id)}
            className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-body-light hover:bg-hover-surface2')}>
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[10px] font-semibold text-accent-text')}>
              {person.avatar ? <img src={person.avatar} alt="" className={cn('h-full w-full object-cover')} /> : person.name.slice(0, 1).toUpperCase()}
            </span>
            <span className={cn('truncate')}>{person.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedShareMenu({ onShare, count = 0, disabled }: Readonly<{
  onShare: (target: FeedShareTarget, dmUserId?: string) => Promise<FeedShareResult | null>;
  count?: number;
  disabled?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const [dmMode, setDmMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => { setOpen(false); setDmMode(false); }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent) => {
      const node = event.target as Node;
      if (menuRef.current?.contains(node) || btnRef.current?.contains(node)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, closeMenu]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const pick = useCallback(async (target: FeedShareTarget, done: string, dmUserId?: string) => {
    closeMenu();
    btnRef.current?.focus();
    const result = await onShare(target, dmUserId);
    if (target === 'link' && result?.link) {
      try { await navigator.clipboard.writeText(result.link); } catch { /* clipboard blocked — link still shared */ }
    }
    setToast(result ? done : 'Could not share');
  }, [onShare, closeMenu]);

  return (
    // Escape lives on the wrapper (an ancestor of the trigger) so it closes the
    // menu even while focus is still on the button — right after opening.
    <div className={cn('relative')} onKeyDown={(event) => { if (event.key === 'Escape' && open) { closeMenu(); btnRef.current?.focus(); } }}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Share"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:bg-hover-surface2 disabled:opacity-40')}
      >
        <Share2 className={cn('h-4 w-4')} />
        Share{count > 0 ? ` · ${count}` : ''}
      </button>
      {open && (
        <div
          ref={menuRef}
          aria-label="Share options"
          className={cn('absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-surface-primary py-1 shadow-lg')}
        >
          {dmMode ? (
            <DmRecipients onPick={(id) => void pick('dm', 'Sent', id)} onBack={() => setDmMode(false)} />
          ) : (
            ITEMS.map(({ target, label, done, Icon }) => (
              <button
                key={target}
                type="button"
                onClick={() => (target === 'dm' ? setDmMode(true) : void pick(target, done))}
                className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-body-light hover:bg-hover-surface2')}
              >
                <Icon className={cn('h-4 w-4 text-ink-muted')} />
                {label}
              </button>
            ))
          )}
        </div>
      )}
      {toast && (
        <span role="status" aria-live="polite" className={cn('absolute right-0 top-full z-30 mt-1 whitespace-nowrap rounded-md bg-surface-inverse px-2 py-1 text-xs text-ink-inverse shadow-lg')}>
          {toast}
        </span>
      )}
    </div>
  );
}
