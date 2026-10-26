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

import React, { useEffect, useRef } from 'react';
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
  onStartEdit: () => void;
  /** `refocus`: the edit ended from the keyboard, so focus returns to the title. */
  onCommit: (refocus?: boolean) => void;
  onCancel: (refocus?: boolean) => void;
  /** Navigate to the database's origin page. Absent → no open arrow. */
  onOpen?: () => void;
}

/** Notion collection-view title: clicking the name renames it in place; the
 *  diagonal arrow beside it opens the database's origin page. */
export function InlineTitle({
  name, icon, hidden, isEditing, titleValue, setTitleValue, onStartEdit, onCommit, onCancel, onOpen,
}: Readonly<InlineTitleProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [isEditing]);

  if (hidden && !isEditing) return <div className={cn('min-w-0 flex-1')} />;

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={titleValue}
        onChange={e => setTitleValue(e.target.value)}
        onBlur={() => onCommit()}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(true); if (e.key === 'Escape') onCancel(true); }}
        aria-label="Database title"
        className={cn('text-[1.25rem] font-semibold text-ink outline-none bg-transparent border-b-2 border-accent-border px-0.5 min-w-[120px]')}
      />
    );
  }

  return (
    <div className={cn('group/title flex min-w-0 max-w-full items-center gap-1')}>
      {icon && <span className={cn('text-[1.1rem] leading-none shrink-0')}>{icon}</span>}
      <button
        type="button"
        data-database-title
        onClick={onStartEdit}
        title="Rename"
        className={cn('min-w-[96px] max-w-full truncate rounded-md px-1 py-0.5 text-left text-[1.25rem] font-semibold leading-tight text-ink hover:bg-hover-surface2 transition-colors')}
      >
        {name}
      </button>
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          title="Open database"
          aria-label="Open database"
          className={cn('shrink-0 rounded-md p-1 text-ink-muted opacity-0 group-hover/title:opacity-100 focus-visible:opacity-100 hover:bg-hover-surface2 transition-opacity')}
        >
          <ArrowUpRight aria-hidden className={cn('w-3.5 h-3.5')} />
        </button>
      )}
    </div>
  );
}
