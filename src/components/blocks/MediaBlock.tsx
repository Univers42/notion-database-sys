/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MediaBlock.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:28 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { Image, Film, Music, Paperclip, Bookmark, Upload } from 'lucide-react';
import { cn } from '../../utils/cn';

const MEDIA_CONFIG: Record<string, { icon: typeof Image; label: string; accept?: string }> = {
  image: { icon: Image, label: 'image', accept: 'image/*' },
  video: { icon: Film, label: 'video', accept: 'video/*' },
  audio: { icon: Music, label: 'audio', accept: 'audio/*' },
  file: { icon: Paperclip, label: 'file' },
  bookmark: { icon: Bookmark, label: 'web bookmark' },
};

/** Renders image, video, audio, or file blocks with upload placeholder support. */
export function MediaBlock({ block, pageId }: Readonly<BlockRendererProps>) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const config = MEDIA_CONFIG[block.type] || MEDIA_CONFIG.file;
  const Icon = config.icon;

  const handleUrlInput = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const url = (e.target as HTMLInputElement).value.trim();
        if (url) {
          updateBlock(pageId, block.id, { url, content: url });
        }
      }
    },
    [updateBlock, pageId, block.id]
  );

  // If we have a URL, render the media
  if (block.url) {
    if (block.type === 'image') {
      return (
        <div className={cn("my-2")}>
          <img
            src={block.url}
            alt={block.caption || ''}
            className={cn("max-w-full rounded-lg border border-line")}
          />
          {block.caption && (
            <p className={cn("text-xs text-ink-muted mt-1 text-center")}>{block.caption}</p>
          )}
        </div>
      );
    }
    if (block.type === 'video') {
      return (
        <div className={cn("my-2")}>
          <video
            src={block.url}
            controls
            className={cn("max-w-full rounded-lg border border-line")}
          >
            <track kind="captions" />
          </video>
        </div>
      );
    }
    if (block.type === 'audio') {
      return (
        <div className={cn("my-2")}>
          <audio src={block.url} controls className={cn("w-full")}>
            <track kind="captions" />
          </audio>
        </div>
      );
    }
    if (block.type === 'bookmark') {
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("block my-2 p-3 border border-line rounded-lg hover:bg-hover-surface transition-colors")}
        >
          <div className={cn("flex items-center gap-2")}>
            <Bookmark className={cn("w-4 h-4 text-ink-muted shrink-0")} />
            <span className={cn("text-sm text-accent-text-light truncate")}>{block.url}</span>
          </div>
        </a>
      );
    }
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("block my-2 p-3 border border-line rounded-lg hover:bg-hover-surface transition-colors")}
      >
        <div className={cn("flex items-center gap-2")}>
          <Paperclip className={cn("w-4 h-4 text-ink-muted shrink-0")} />
          <span className={cn("text-sm text-ink-body truncate")}>{block.content || block.url}</span>
        </div>
      </a>
    );
  }

  // Empty state: upload placeholder
  return (
    <div className={cn("my-2 border border-dashed border-line-medium rounded-lg p-6 flex flex-col items-center gap-3 bg-surface-secondary-soft")}>
      <div className={cn("w-10 h-10 rounded-lg bg-surface-tertiary flex items-center justify-center")}>
        <Icon className={cn("w-5 h-5 text-ink-muted")} />
      </div>
      <div className={cn("text-center")}>
        <p className={cn("text-sm text-ink-secondary")}>Add an {config.label}</p>
        <p className={cn("text-xs text-ink-muted mt-0.5")}>Paste a URL or upload a file</p>
      </div>
      <div className={cn("flex items-center gap-2 w-full max-w-xs")}>
        <input
          type="text"
          placeholder={`Paste ${config.label} URL...`}
          className={cn("flex-1 text-xs px-3 py-1.5 border border-line rounded-md outline-none focus:ring-1 focus:ring-focus-ring-solid bg-surface-primary")}
          onKeyDown={handleUrlInput}
        />
        <label className={cn("flex items-center gap-1 text-xs text-ink-secondary hover:text-hover-text-strong px-2 py-1.5 rounded-md border border-line bg-surface-primary cursor-pointer hover:bg-hover-surface")}>
          <Upload className={cn("w-3 h-3")} />
          Upload
          <input type="file" accept={config.accept} className={cn("hidden")} />
        </label>
      </div>
    </div>
  );
}
