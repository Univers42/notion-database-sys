/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   InlineTitle.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/07 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/07 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Props for {@link InlineTitle}. */
export interface InlineTitleProps {
  name: string;
  icon?: string;
  /** view.settings.showTitle === false hides the title (toolbar stays). */
  hidden?: boolean;
  isEditing: boolean;
  titleValue: string;
  setTitleValue: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  /** Navigate to the database's origin page. Absent → static heading. */
  onOpen?: () => void;
}

/** Notion collection-view title: icon + name as a link to the database origin,
 *  with the diagonal-arrow affordance on hover; swaps to an input while renaming. */
export function InlineTitle({
  name, icon, hidden, isEditing, titleValue, setTitleValue, onCommit, onCancel, onOpen,
}: Readonly<InlineTitleProps>) {
  if (hidden && !isEditing) return <div className={cn('min-w-0 flex-1')} />;

  if (isEditing) {
    return (
      <input
        value={titleValue}
        onChange={e => setTitleValue(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}
        aria-label="Database title"
        className={cn('text-[1.25rem] font-semibold text-ink outline-none bg-transparent border-b-2 border-accent-border px-0.5 min-w-[120px]')}
      />
    );
  }

  const content = (
    <>
      {icon && <span className={cn('text-[1.1rem] leading-none shrink-0')}>{icon}</span>}
      <span className={cn('truncate text-[1.25rem] font-semibold leading-tight text-ink')}>{name}</span>
      {onOpen && (
        <ArrowUpRight aria-hidden className={cn('w-3.5 h-3.5 shrink-0 text-ink-muted opacity-0 group-hover/title:opacity-100 transition-opacity')} />
      )}
    </>
  );

  if (!onOpen) {
    return <div className={cn('flex min-w-0 items-center gap-1.5 px-1 py-0.5')}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Open database"
      className={cn('group/title flex min-w-[96px] max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left hover:bg-hover-surface2 transition-colors')}
    >
      {content}
    </button>
  );
}
