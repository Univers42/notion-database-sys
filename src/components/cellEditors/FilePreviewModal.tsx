/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilePreviewModal.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// In-place media viewer for a files & media cell. Opens above the cell editor,
// renders images/video/audio/PDF inline (and a download fallback for anything
// else — e.g. archives), and steps through every attachment on the record with
// the arrow keys, so one cell holding many files is browsable without leaving.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileArchive, X } from 'lucide-react';
import type { FileAttachment } from '../../types/database';
import { Z } from '../../utils/geometry';
import { cn } from '../../utils/cn';

type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'other';

/** Re-derives the media kind from the url/name at view time (independent of the
 *  coarse stored `type`), so a video kept as `other` still plays. */
function resolvePreviewKind(file: FileAttachment): PreviewKind {
  const s = `${file.url} ${file.name}`.toLowerCase();
  if (file.type === 'image' || /^data:image\/|\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)($|\?)/.test(s)) return 'image';
  if (/^data:video\/|\.(mp4|webm|ogv|mov|m4v|avi|mkv)($|\?)/.test(s)) return 'video';
  if (/^data:audio\/|\.(mp3|wav|ogg|oga|m4a|aac|flac)($|\?)/.test(s)) return 'audio';
  if (file.type === 'pdf' || /^data:application\/pdf|\.pdf($|\?)/.test(s)) return 'pdf';
  return 'other';
}

const MEDIA_CLASS = 'max-w-full max-h-[72vh] object-contain rounded';

/** Renders the current attachment by its resolved kind. */
function PreviewBody({ file }: Readonly<{ file: FileAttachment }>) {
  switch (resolvePreviewKind(file)) {
    case 'image':
      return <img src={file.url} alt={file.name} className={cn(MEDIA_CLASS)} />;
    case 'video':
      return <video src={file.url} controls className={cn(MEDIA_CLASS)}>{file.name}</video>;
    case 'audio':
      return <audio src={file.url} controls className={cn('w-full')}>{file.name}</audio>;
    case 'pdf':
      return <iframe src={file.url} title={file.name} className={cn('w-[80vw] max-w-3xl h-[72vh] rounded bg-surface-secondary')} />;
    default:
      return (
        <div className={cn('flex flex-col items-center gap-3 py-10 px-8 text-center text-ink-muted')}>
          <FileArchive className={cn('w-12 h-12 text-ink-disabled')} />
          <div className={cn('text-sm text-ink-body')}>No inline preview for this file type.</div>
          <a href={file.url} download={file.name}
            className={cn('px-3 py-1.5 text-sm font-medium rounded-md bg-accent text-ink-inverse hover:opacity-90')}>
            Download {file.name}
          </a>
        </div>
      );
  }
}

interface FilePreviewModalProps {
  attachments: FileAttachment[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}

/** Portaled, arrow-navigable media viewer for the files & media cell. */
export function FilePreviewModal({ attachments, index, onIndexChange, onClose }: Readonly<FilePreviewModalProps>) {
  const total = attachments.length;
  const step = (delta: number) => onIndexChange((index + delta + total) % total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight' && total > 1) step(1);
      else if (e.key === 'ArrowLeft' && total > 1) step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const file = attachments[index];
  if (!file) return null;

  const navBtn = 'p-1.5 rounded-full bg-surface-primary/80 text-ink-body hover:bg-hover-surface3 shadow';
  const iconBtn = 'p-1.5 rounded-md text-ink-muted hover:text-ink-body hover:bg-hover-surface2';

  return createPortal(
    <>
      <button type="button" aria-label="Close preview" tabIndex={-1}
        onPointerDown={e => { e.stopPropagation(); onClose(); }}
        className={cn('fixed inset-0 appearance-none border-0 p-0 cursor-default')}
        style={{ zIndex: Z.PICKER, background: 'rgba(0,0,0,0.72)' }} />
      <dialog open aria-label="Media preview"
        className={cn('odb-pop-in fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col bg-surface-primary border border-line rounded-xl shadow-2xl overflow-hidden')}
        style={{ zIndex: Z.PICKER_INNER, maxWidth: '92vw' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
        <header className={cn('flex items-center gap-2 px-3 py-2 border-b border-line')}>
          <span className={cn('truncate text-sm font-medium text-ink-body flex-1')} title={file.name}>{file.name}</span>
          {total > 1 && <span className={cn('text-xs text-ink-muted tabular-nums shrink-0')}>{index + 1} / {total}</span>}
          <a href={file.url} target="_blank" rel="noreferrer" aria-label="Open in new tab" title="Open in new tab"
            onClick={e => e.stopPropagation()} className={cn(iconBtn)}><ExternalLink className={cn('w-4 h-4')} /></a>
          <a href={file.url} download={file.name} aria-label="Download" title="Download"
            onClick={e => e.stopPropagation()} className={cn(iconBtn)}><Download className={cn('w-4 h-4')} /></a>
          <button type="button" autoFocus aria-label="Close preview" onClick={onClose} className={cn(iconBtn)}>
            <X className={cn('w-4 h-4')} />
          </button>
        </header>
        <div className={cn('relative flex items-center justify-center p-4 bg-surface-secondary')}>
          {total > 1 && (
            <button type="button" aria-label="Previous file" onClick={() => step(-1)}
              className={cn('absolute left-2 top-1/2 -translate-y-1/2', navBtn)}><ChevronLeft className={cn('w-5 h-5')} /></button>
          )}
          <PreviewBody file={file} />
          {total > 1 && (
            <button type="button" aria-label="Next file" onClick={() => step(1)}
              className={cn('absolute right-2 top-1/2 -translate-y-1/2', navBtn)}><ChevronRight className={cn('w-5 h-5')} /></button>
          )}
        </div>
      </dialog>
    </>,
    document.body,
  );
}
