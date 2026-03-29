import React, { useCallback } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { Image, Film, Music, Paperclip, Bookmark, Upload } from 'lucide-react';

const MEDIA_CONFIG: Record<string, { icon: typeof Image; label: string; accept?: string }> = {
  image: { icon: Image, label: 'image', accept: 'image/*' },
  video: { icon: Film, label: 'video', accept: 'video/*' },
  audio: { icon: Music, label: 'audio', accept: 'audio/*' },
  file: { icon: Paperclip, label: 'file' },
  bookmark: { icon: Bookmark, label: 'web bookmark' },
};

export function MediaBlock({ block, pageId }: BlockRendererProps) {
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
        <div className="my-2">
          <img
            src={block.url}
            alt={block.caption || ''}
            className="max-w-full rounded-lg border border-gray-200"
          />
          {block.caption && (
            <p className="text-xs text-gray-400 mt-1 text-center">{block.caption}</p>
          )}
        </div>
      );
    }
    if (block.type === 'video') {
      return (
        <div className="my-2">
          <video
            src={block.url}
            controls
            className="max-w-full rounded-lg border border-gray-200"
          />
        </div>
      );
    }
    if (block.type === 'audio') {
      return (
        <div className="my-2">
          <audio src={block.url} controls className="w-full" />
        </div>
      );
    }
    if (block.type === 'bookmark') {
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block my-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-blue-600 truncate">{block.url}</span>
          </div>
        </a>
      );
    }
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block my-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-700 truncate">{block.content || block.url}</span>
        </div>
      </a>
    );
  }

  // Empty state: upload placeholder
  return (
    <div className="my-2 border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-3 bg-gray-50/50">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-500">Add an {config.label}</p>
        <p className="text-xs text-gray-400 mt-0.5">Paste a URL or upload a file</p>
      </div>
      <div className="flex items-center gap-2 w-full max-w-xs">
        <input
          type="text"
          placeholder={`Paste ${config.label} URL...`}
          className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          onKeyDown={handleUrlInput}
        />
        <label className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-md border border-gray-200 bg-white cursor-pointer hover:bg-gray-50">
          <Upload className="w-3 h-3" />
          Upload
          <input type="file" accept={config.accept} className="hidden" />
        </label>
      </div>
    </div>
  );
}
