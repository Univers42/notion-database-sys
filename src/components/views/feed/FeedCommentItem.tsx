/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedCommentItem.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/22 14:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * One comment (avatar + author + relative time + body) with own-comment inline
 * edit / delete, a Reply affordance, and one level of indented replies. The
 * composer is shared by the top-level box, the reply box, and inline edit.
 *
 * The composer ANSWERS a moderation warning: L0 may hold a comment back and ask
 * the author first (a 409 — nothing is written). The words stay in the box, the
 * warning is announced, and the author edits them or posts them anyway.
 */

import React, { useRef, useState } from 'react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { Pencil, Trash2, Reply } from 'lucide-react';

import { cn } from '../../../utils/cn';
import type { FeedComment, FeedCommentWriteResult, FeedModerationWarning } from './useFeedComments';

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
  onSubmit: (content: string, acknowledgeWarning?: boolean) => Promise<FeedCommentWriteResult>;
  initial?: string;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}>) {
  const [draft, setDraft] = useState(initial);
  const [warning, setWarning] = useState<FeedModerationWarning | null>(null);
  const [failed, setFailed] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const submit = async (acknowledgeWarning = false) => {
    const text = draft.trim();
    if (!text) return;
    const result = await onSubmit(text, acknowledgeWarning);
    if (result.ok) {
      setWarning(null);
      setFailed(false);
      // The inline edit and the reply close themselves; the top-level composer
      // clears + keeps focus for the next comment.
      if (onCancel) onCancel();
      else setDraft('');
      return;
    }
    // The words stay: the author edits them, or posts them anyway.
    setWarning('warning' in result ? result.warning : null);
    setFailed(!('warning' in result));
  };
  const edit = () => {
    setWarning(null);
    setFailed(false);
    areaRef.current?.focus();
  };
  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className={cn('flex flex-col gap-1.5')}>
      <textarea
        ref={areaRef}
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
      {/* The warning is announced, not shouted: the author hears it once. */}
      <div aria-live="polite" className={cn('flex flex-col gap-1')}>
        {failed && <p className={cn('text-xs text-danger-text')}>The comment could not be saved.</p>}
        {warning && (
          <div className={cn('rounded-lg bg-surface-muted px-3 py-2')}>
            <p className={cn('text-xs text-ink-body-light')}>{warning.message}</p>
            {warning.terms.length > 0 && <p className={cn('mt-0.5 text-xs text-danger-text')}>Matched: {warning.terms.join(', ')}</p>}
            <div className={cn('mt-1 flex gap-3')}>
              <button type="button" onClick={edit} className={cn('text-xs text-ink-muted hover:text-ink')}>Edit</button>
              <button type="button" onClick={() => void submit(true)} className={cn('text-xs text-ink-muted hover:text-ink')}>Post anyway</button>
            </div>
          </div>
        )}
      </div>
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
  onEdit: (id: string, content: string, acknowledgeWarning?: boolean) => Promise<FeedCommentWriteResult>;
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
            onSubmit={(content, acknowledgeWarning) => onEdit(comment.id, content, acknowledgeWarning)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <p className={cn('whitespace-pre-wrap break-words text-sm text-ink-body-light')}>{comment.content}</p>
        )}
        {mine && comment.moderationState === 'held' && (
          <p className={cn('mt-0.5 text-xs text-ink-muted')}>Held for review — only you can see it</p>
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
  onEdit: (id: string, content: string, acknowledgeWarning?: boolean) => Promise<FeedCommentWriteResult>;
  onDelete: (id: string) => void;
  onReply: (parentId: string, content: string, acknowledgeWarning?: boolean) => Promise<FeedCommentWriteResult>;
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
            onSubmit={(content, acknowledgeWarning) => onReply(root.id, content, acknowledgeWarning)}
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
