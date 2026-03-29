import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { FileText, ArrowUpRight } from 'lucide-react';

export function PageBlock({ block }: BlockRendererProps) {
  return (
    <div className="my-1">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
      >
        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-700 flex-1 truncate">
          {block.content || 'Untitled page'}
        </span>
        <ArrowUpRight className="w-3.5 h-3.5 text-gray-300" />
      </button>
    </div>
  );
}
