/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   EmbedBlock.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:35:08 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback, useMemo } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { Globe, ExternalLink } from 'lucide-react';

/** Known embed providers with URL patterns → iframe src transforms */
const EMBED_PROVIDERS: { pattern: RegExp; transform: (url: string, match: RegExpMatchArray) => string; aspectRatio?: string }[] = [
  // YouTube
  { pattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/, transform: (_, m) => `https://www.youtube.com/embed/${m[1]}`, aspectRatio: '16/9' },
  // Vimeo
  { pattern: /vimeo\.com\/(\d+)/, transform: (_, m) => `https://player.vimeo.com/video/${m[1]}`, aspectRatio: '16/9' },
  // Figma
  { pattern: /figma\.com\/(file|proto)\//, transform: (url) => `https://www.figma.com/embed?embed_host=notion&url=${encodeURIComponent(url)}`, aspectRatio: '16/10' },
  // Loom
  { pattern: /loom\.com\/share\/([\w-]+)/, transform: (_, m) => `https://www.loom.com/embed/${m[1]}`, aspectRatio: '16/9' },
  // CodePen
  { pattern: /codepen\.io\/([\w-]+)\/pen\/([\w-]+)/, transform: (_, m) => `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result`, aspectRatio: '16/9' },
  // Google Maps
  { pattern: /google\.com\/maps\/embed/, transform: (url) => url, aspectRatio: '16/9' },
  // Twitter/X
  { pattern: /(?:twitter|x)\.com\/\w+\/status\/(\d+)/, transform: (url) => `https://platform.twitter.com/embed/Tweet.html?id=${/(\d+)$/.exec(url)?.[1]}`, aspectRatio: '3/4' },
  // Generic iframe fallback
  { pattern: /^https?:\/\//, transform: (url) => url, aspectRatio: '16/9' },
];

function resolveEmbed(url: string): { src: string; aspectRatio: string } | null {
  for (const provider of EMBED_PROVIDERS) {
    const match = provider.pattern.exec(url);
    if (match) {
      return {
        src: provider.transform(url, match),
        aspectRatio: provider.aspectRatio || '16/9',
      };
    }
  }
  return null;
}

export function EmbedBlock({ block, pageId }: Readonly<BlockRendererProps>) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = useCallback(() => {
    const url = urlInput.trim();
    if (url) {
      updateBlock(pageId, block.id, { url, content: url });
      setUrlInput('');
    }
  }, [urlInput, updateBlock, pageId, block.id]);

  const embed = useMemo(() => block.url ? resolveEmbed(block.url) : null, [block.url]);

  if (block.url && embed) {
    return (
      <div className="my-2">
        <div
          className="relative w-full rounded-lg overflow-hidden border border-line"
          style={{ aspectRatio: embed.aspectRatio }}
        >
          <iframe
            title="Embedded content"
            src={embed.src}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-muted hover:text-accent-text-light flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            {block.url.length > 60 ? block.url.slice(0, 60) + '…' : block.url}
          </a>
        </div>
      </div>
    );
  }

  // Empty state — URL input
  return (
    <div className="my-2 border border-dashed border-line-medium rounded-lg p-6 flex flex-col items-center gap-3 bg-surface-secondary-soft">
      <div className="w-10 h-10 rounded-lg bg-surface-tertiary flex items-center justify-center">
        <Globe className="w-5 h-5 text-ink-muted" />
      </div>
      <p className="text-sm text-ink-secondary">Embed a URL</p>
      <p className="text-xs text-ink-muted">YouTube, Figma, Vimeo, CodePen, and more</p>
      <div className="flex items-center gap-2 w-full max-w-sm">
        <input
          type="text"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="Paste embed URL..."
          className="flex-1 text-xs px-3 py-1.5 border border-line rounded-md outline-none focus:ring-1 focus:ring-focus-ring-solid bg-surface-primary"
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        />
        <button
          onClick={handleSubmit}
          className="text-xs px-3 py-1.5 bg-accent text-ink-inverse rounded-md hover:bg-hover-accent transition-colors"
        >
          Embed
        </button>
      </div>
    </div>
  );
}
