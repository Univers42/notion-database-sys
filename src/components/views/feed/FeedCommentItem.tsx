/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedCommentItem.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * One comment (avatar + author + relative time + body) with own-comment inline
 * edit / delete, a Reply affordance, and one level of indented replies. The
 * composer is shared by the top-level box, the reply box, and inline edit.
 */

import React, { useState } from 'react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { Pencil, Trash2, Reply } from 'lucide-react';

import { cn } from '../../../utils/cn';
import type { FeedComment } from './useFeedComments';

export interface CommentNode { comment: FeedComment; replies: FeedComment[] }

function relLabel(iso: string): { rel: string; abs: string } {
  try {
    const date = parseISO(iso);
    return { rel: formatDistanceToNow(date, { addSuffix: true }), abs: format(date, 'PPpp') };
  } catch {
    return { rel: '', abs: iso };
  }
}

export function FeedCommentComposer({ onSubmit, initial = '', placeholder = 'Write a comment…', submitLabel = 'Post', autoFocus, onCancel }: Readonly<{
  onSubmit: (content: string) => void | Promise<void>;
  initial?: string;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}>) {
  const [draft, setDraft] = useState(initial);
  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    await onSubmit(text);
    if (!onCancel) setDraft(''); // the top-level composer clears + keeps focus for the next comment
  };
  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className={cn('flex flex-col gap-1.5')}>
      <textarea
        autoFocus={autoFocus}
        value={draft}
        rows={2}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); void submit(); }
          if (event.key === 'Escape' && onCancel) onCancel();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn('w-full resize-none rounded-lg border border-line bg-surface-secondary px-3 py-2 text-sm outline-none focus:border-accent')}
      />
      <div className={cn('flex items-center gap-2 self-end text-xs')}>
        {onCancel && <button type="button" onClick={onCancel} className={cn('text-ink-muted hover:text-ink')}>Cancel</button>}
        <button type="submit" disabled={!draft.trim()} className={cn('rounded-lg bg-accent-soft px-3 py-1 font-medium text-accent-text disabled:opacity-40')}>{submitLabel}</button>
      </div>
    </form>
  );
}

function FeedCommentLine({ comment, mine, onEdit, onDelete, actions }: Readonly<{
  comment: FeedComment;
  mine: boolean;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  actions?: React.ReactNode;
}>) {
  const [editing, setEditing] = useState(false);
  const time = relLabel(comment.createdAt);
  const edited = Boolean(comment.updatedAt) && new Date(comment.updatedAt as string).getTime() > new Date(comment.createdAt).getTime();
  return (
    <div className={cn('flex gap-2')}>
      {comment.authorAvatar
        ? <img src={comment.authorAvatar} alt="" className={cn('h-8 w-8 shrink-0 rounded-full object-cover')} />
        : <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink-secondary')}>{(comment.authorName || '?').charAt(0).toUpperCase()}</div>}
      <div className={cn('min-w-0 flex-1')}>
        <div className={cn('flex flex-wrap items-baseline gap-2')}>
          <span className={cn('text-sm font-semibold text-ink')}>{comment.authorName}</span>
          <time dateTime={comment.createdAt} title={time.abs} className={cn('text-xs text-ink-muted')}>{time.rel}</time>
          {edited && <span className={cn('text-xs italic text-ink-muted')}>(edited)</span>}
        </div>
        {editing ? (
          <FeedCommentComposer
            initial={comment.content}
            submitLabel="Save"
            autoFocus
            onSubmit={(content) => { onEdit(comment.id, content); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <p className={cn('whitespace-pre-wrap break-words text-sm text-ink-body-light')}>{comment.content}</p>
        )}
        {!editing && (
          <div className={cn('mt-0.5 flex items-center gap-3 text-xs text-ink-muted')}>
            {actions}
            {mine && <button type="button" onClick={() => setEditing(true)} className={cn('inline-flex items-center gap-1 hover:text-ink')}><Pencil className={cn('h-3 w-3')} />Edit</button>}
            {mine && <button type="button" onClick={() => onDelete(comment.id)} className={cn('inline-flex items-center gap-1 hover:text-danger-text')}><Trash2 className={cn('h-3 w-3')} />Delete</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export function FeedCommentItem({ node, myId, onEdit, onDelete, onReply }: Readonly<{
  node: CommentNode;
  myId: string | null;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: (parentId: string, content: string) => void;
}>) {
  const [replying, setReplying] = useState(false);
  const root = node.comment;
  const replyToggle = (
    <button type="button" onClick={() => setReplying((value) => !value)} className={cn('inline-flex items-center gap-1 hover:text-ink')}>
      <Reply className={cn('h-3 w-3')} />Reply
    </button>
  );
  return (
    <li className={cn('flex flex-col gap-2')}>
      <FeedCommentLine comment={root} mine={root.authorId === myId} onEdit={onEdit} onDelete={onDelete} actions={replyToggle} />
      {replying && (
        <div className={cn('ml-10')}>
          <FeedCommentComposer
            autoFocus
            submitLabel="Reply"
            placeholder={`Reply to ${root.authorName}…`}
            onSubmit={(content) => { onReply(root.id, content); setReplying(false); }}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}
      {node.replies.length > 0 && (
        <ul className={cn('ml-10 flex flex-col gap-2 border-l border-line-light pl-3')}>
          {node.replies.map((reply) => (
            <li key={reply.id}>
              <FeedCommentLine comment={reply} mine={reply.authorId === myId} onEdit={onEdit} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
