import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { Table, Columns, LayoutGrid, List } from 'lucide-react';

const VIEW_CONFIG: Record<string, { icon: typeof Table; label: string }> = {
  table_view: { icon: Table, label: 'Table view' },
  board_view: { icon: Columns, label: 'Board view' },
  gallery_view: { icon: LayoutGrid, label: 'Gallery view' },
  list_view: { icon: List, label: 'List view' },
};

export function DatabaseViewBlock({ block }: BlockRendererProps) {
  const config = VIEW_CONFIG[block.type] || VIEW_CONFIG.table_view;
  const Icon = config.icon;

  return (
    <div className="my-2 border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {block.content || config.label}
        </span>
      </div>
      <div className="px-4 py-8 text-center">
        <p className="text-xs text-gray-400">
          Linked {config.label.toLowerCase()} — click to configure
        </p>
      </div>
    </div>
  );
}
