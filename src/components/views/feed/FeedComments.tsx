/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedComments.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * The comment thread: a live-region list (oldest→newest, one level of replies)
 * over a persistent composer. Groups the flat server list into top-level nodes
 * + their replies; a reply whose parent is itself a reply is surfaced at the
 * root so nothing is ever hidden.
 */

import React, { useMemo } from 'react';

import { cn } from '../../../utils/cn';
import type { FeedComment } from './useFeedComments';
import { FeedCommentComposer, FeedCommentItem, type CommentNode } from './FeedCommentItem';

function buildCommentTree(comments: FeedComment[]): CommentNode[] {
  const roots: CommentNode[] = [];
  const byId = new Map<string, CommentNode>();
  for (const comment of comments) {
    if (comment.parentId) continue;
    const node: CommentNode = { comment, replies: [] };
    byId.set(comment.id, node);
    roots.push(node);
  }
  for (const comment of comments) {
    if (!comment.parentId) continue;
    const parent = byId.get(comment.parentId);
    if (parent) parent.replies.push(comment);
    else roots.push({ comment, replies: [] }); // orphaned reply → show as its own root
  }
  return roots;
}

export function FeedComments({ comments, myId, onAdd, onEdit, onDelete }: Readonly<{
  comments: FeedComment[] | null;
  myId: string | null;
  onAdd: (content: string, parentId?: string) => void | Promise<void>;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}>) {
  const tree = useMemo(() => buildCommentTree(comments ?? []), [comments]);
  return (
    <div className={cn('flex flex-col gap-3')}>
      <ul role="log" aria-live="polite" aria-label="Comments" className={cn('flex flex-col gap-3')}>
        {tree.length === 0 && <li className={cn('py-1 text-sm text-ink-muted')}>No comments yet — start the discussion.</li>}
        {tree.map((node) => (
          <FeedCommentItem
            key={node.comment.id}
            node={node}
            myId={myId}
            onEdit={onEdit}
            onDelete={onDelete}
            onReply={(parentId, content) => onAdd(content, parentId)}
          />
        ))}
      </ul>
      <FeedCommentComposer onSubmit={(content) => onAdd(content)} />
    </div>
  );
}
