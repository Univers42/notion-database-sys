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
    <div className="my-2 border border-line rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-secondary border-b border-line">
        <Icon className="w-4 h-4 text-ink-secondary" />
        <span className="text-sm font-medium text-ink-body">
          {block.content || config.label}
        </span>
      </div>
      <div className="px-4 py-8 text-center">
        <p className="text-xs text-ink-muted">
          Linked {config.label.toLowerCase()} — click to configure
        </p>
      </div>
    </div>
  );
}
