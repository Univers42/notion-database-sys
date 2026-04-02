// ─── SortSettingsSubpanel — Notion-style sort panel for ViewSettings ─────────

import React, { useState } from 'react';
import { ChevronDown, Plus, GripVertical, X, Trash2 } from 'lucide-react';
import type { SchemaProperty, Sort } from '../../types/database';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { SortPropertyPicker } from './SortPropertyPicker';

// ─── Direction picker popup ──────────────────────────────────────────────────

function DirectionPicker({ direction, onChange }: Readonly<{
  direction: 'asc' | 'desc';
  onChange: (d: 'asc' | 'desc') => void;
}>) {
  const [open, setOpen] = useState(false);
  const label = direction === 'asc' ? 'Ascending' : 'Descending';

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 h-7 px-2 text-sm rounded-md border border-line bg-surface-tertiary hover:bg-hover-surface transition-colors truncate max-w-[180px]">
        <span className="truncate">{label}</span>
        <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-36 rounded-lg shadow-lg border border-line bg-surface-primary py-1">
          {(['asc', 'desc'] as const).map(d => (
            <button key={d}
              onClick={() => { onChange(d); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                d === direction
                  ? 'bg-accent-soft text-accent-text font-medium'
                  : 'text-ink-body hover:bg-hover-surface'
              }`}>
              {d === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Property picker button (inline dropdown) ───────────────────────────────

function PropertyPicker({ propertyId, properties, onChange }: Readonly<{
  propertyId: string;
  properties: Record<string, SchemaProperty>;
  onChange: (propId: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const prop = properties[propertyId];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 h-7 px-2 text-sm rounded-md border border-line bg-surface-tertiary hover:bg-hover-surface transition-colors truncate max-w-[180px]">
        {prop && <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-ink-muted shrink-0" />}
        <span className="truncate">{prop?.name ?? 'Unknown'}</span>
        <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-48 max-h-52 overflow-y-auto rounded-lg shadow-lg border border-line bg-surface-primary py-1">
          {Object.values(properties).map(p => (
            <button key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                p.id === propertyId
                  ? 'bg-accent-soft text-accent-text font-medium'
                  : 'text-ink-body hover:bg-hover-surface'
              }`}>
              <PropertyTypeIcon type={p.type} className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SortSettingsSubpanel({ viewId, properties, sorts, onBack, onClose }: Readonly<{
  viewId: string;
  properties: Record<string, SchemaProperty>;
  sorts: Sort[];
  onBack: () => void;
  onClose: () => void;
}>) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const { addSort, updateSort, removeSort, clearSorts } = useDatabaseStore();

  return (
    <div className="flex flex-col" style={{ minWidth: 290, maxHeight: '80vh' }}>
      {/* ─── Header ─── */}
      <div className="flex items-center px-3 pt-3.5 pb-1.5 h-[42px] shrink-0">
        <button onClick={onBack}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 mr-2 text-ink-secondary transition-colors">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path d="M2.16 8.206q.046.13.148.236l4.32 4.32a.625.625 0 0 0 .884-.884L4.259 8.625h8.991a.625.625 0 1 0 0-1.25H4.259l3.253-3.253a.625.625 0 1 0-.884-.884l-4.32 4.32a.62.62 0 0 0-.148.648" fill="currentColor" />
          </svg>
        </button>
        <span className="flex-1 font-semibold text-sm truncate">Sort</span>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-surface-tertiary hover:bg-hover-surface3 text-ink-muted transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── Sort rows ─── */}
      <div className="overflow-y-auto flex-1 min-h-0 px-1 pt-2">
        {sorts.map(sort => (
          <div key={sort.id} className="flex items-center py-1 px-1 gap-1">
            <GripVertical className="w-4 h-4 text-ink-disabled shrink-0 cursor-grab" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <PropertyPicker
                propertyId={sort.propertyId}
                properties={properties}
                onChange={propId => updateSort(viewId, sort.id, { propertyId: propId })}
              />
              <DirectionPicker
                direction={sort.direction}
                onChange={direction => updateSort(viewId, sort.id, { direction })}
              />
            </div>
            <button onClick={() => removeSort(viewId, sort.id)}
              className="p-0.5 text-ink-muted hover:text-ink-body rounded hover:bg-hover-surface transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* ─── Add sort button ─── */}
        <button onClick={() => setShowAddPicker(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors">
          <Plus className="w-4 h-4" /><span>Add a sort</span>
        </button>

        {/* ─── Delete all button (only if sorts exist) ─── */}
        {sorts.length > 0 && (
          <button onClick={() => clearSorts(viewId)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors">
            <Trash2 className="w-4 h-4" /><span>Delete sort</span>
          </button>
        )}
      </div>

      {/* ─── Property picker overlay ─── */}
      {showAddPicker && (
        <div className="border-t border-line-light">
          <SortPropertyPicker
            properties={Object.values(properties)}
            onSelect={propId => {
              addSort(viewId, { propertyId: propId, direction: 'asc' });
              setShowAddPicker(false);
            }}
            onClose={() => setShowAddPicker(false)}
          />
        </div>
      )}
    </div>
  );
}
