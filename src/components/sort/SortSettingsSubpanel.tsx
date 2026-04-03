// ─── SortSettingsSubpanel — Notion-style sort panel for ViewSettings ─────────

import React, { useState } from 'react';
import { ChevronDown, Plus, GripVertical, X, Trash2 } from 'lucide-react';
import type { SchemaProperty, Sort } from '../../types/database';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { PropertyTypeIcon } from '../filters/PropertyTypeIcon';
import { SortPropertyPicker } from './SortPropertyPicker';
import { cn } from '../../utils/cn';

export type SortSettingsSubpanelSlots = {
  root: string;
  header: string;
  backButton: string;
  title: string;
  closeButton: string;
  body: string;
  sortRow: string;
  sortRowInner: string;
  removeButton: string;
  addSortButton: string;
  deleteSortButton: string;
  pickerWrap: string;
};

// ─── Direction picker popup ──────────────────────────────────────────────────

function DirectionPicker({ direction, onChange }: Readonly<{
  direction: 'asc' | 'desc';
  onChange: (d: 'asc' | 'desc') => void;
}>) {
  const [open, setOpen] = useState(false);
  const label = direction === 'asc' ? 'Ascending' : 'Descending';

  return (
    <div className={cn("relative")}>
      <button onClick={() => setOpen(!open)}
        className={cn("inline-flex items-center gap-1 h-7 px-2 text-sm rounded-md border border-line bg-surface-tertiary hover:bg-hover-surface transition-colors truncate max-w-[180px]")}>
        <span className={cn("truncate")}>{label}</span>
        <ChevronDown className={cn("w-3 h-3 text-ink-muted shrink-0")} />
      </button>
      {open && (
        <div className={cn("absolute top-full left-0 mt-1 z-50 w-36 rounded-lg shadow-lg border border-line bg-surface-primary py-1")}>
          {(['asc', 'desc'] as const).map(d => (
            <button key={d}
              onClick={() => { onChange(d); setOpen(false); }}
              className={cn(`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                d === direction
                  ? 'bg-accent-soft text-accent-text font-medium'
                  : 'text-ink-body hover:bg-hover-surface'
              }`)}>
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
    <div className={cn("relative")}>
      <button onClick={() => setOpen(!open)}
        className={cn("inline-flex items-center gap-1.5 h-7 px-2 text-sm rounded-md border border-line bg-surface-tertiary hover:bg-hover-surface transition-colors truncate max-w-[180px]")}>
        {prop && <PropertyTypeIcon type={prop.type} className={cn("w-3.5 h-3.5 text-ink-muted shrink-0")} />}
        <span className={cn("truncate")}>{prop?.name ?? 'Unknown'}</span>
        <ChevronDown className={cn("w-3 h-3 text-ink-muted shrink-0")} />
      </button>
      {open && (
        <div className={cn("absolute top-full left-0 mt-1 z-50 w-48 max-h-52 overflow-y-auto rounded-lg shadow-lg border border-line bg-surface-primary py-1")}>
          {Object.values(properties).map(p => (
            <button key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={cn(`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                p.id === propertyId
                  ? 'bg-accent-soft text-accent-text font-medium'
                  : 'text-ink-body hover:bg-hover-surface'
              }`)}>
              <PropertyTypeIcon type={p.type} className={cn("w-3.5 h-3.5 shrink-0")} />
              <span className={cn("truncate")}>{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SortSettingsSubpanel({ viewId, properties, sorts, onBack, onClose, slots }: Readonly<{
  viewId: string;
  properties: Record<string, SchemaProperty>;
  sorts: Sort[];
  onBack: () => void;
  onClose: () => void;
  slots?: Partial<SortSettingsSubpanelSlots>;
}>) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const { addSort, updateSort, removeSort, clearSorts } = useDatabaseStore();

  return (
    <div className={cn("flex flex-col", slots?.root)} style={{ minWidth: 290, maxHeight: '80vh' }}>
      {/* ─── Header ─── */}
      <div className={cn("flex items-center px-3 pt-3.5 pb-1.5 h-[42px] shrink-0", slots?.header)}>
        <button onClick={onBack}
          className={cn("w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 mr-2 text-ink-secondary transition-colors", slots?.backButton)}>
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path d="M2.16 8.206q.046.13.148.236l4.32 4.32a.625.625 0 0 0 .884-.884L4.259 8.625h8.991a.625.625 0 1 0 0-1.25H4.259l3.253-3.253a.625.625 0 1 0-.884-.884l-4.32 4.32a.62.62 0 0 0-.148.648" fill="currentColor" />
          </svg>
        </button>
        <span className={cn("flex-1 font-semibold text-sm truncate", slots?.title)}>Sort</span>
        <button onClick={onClose}
          className={cn("w-6 h-6 flex items-center justify-center rounded-full bg-surface-tertiary hover:bg-hover-surface3 text-ink-muted transition-colors", slots?.closeButton)}>
          <X className={cn("w-3.5 h-3.5")} />
        </button>
      </div>

      {/* ─── Sort rows ─── */}
      <div className={cn("overflow-y-auto flex-1 min-h-0 px-1 pt-2", slots?.body)}>
        {sorts.map(sort => (
          <div key={sort.id} className={cn("flex items-center py-1 px-1 gap-1", slots?.sortRow)}>
            <GripVertical className={cn("w-4 h-4 text-ink-disabled shrink-0 cursor-grab")} />
            <div className={cn("flex items-center gap-1.5 flex-1 min-w-0", slots?.sortRowInner)}>
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
              className={cn("p-0.5 text-ink-muted hover:text-ink-body rounded hover:bg-hover-surface transition-colors shrink-0", slots?.removeButton)}>
              <X className={cn("w-4 h-4")} />
            </button>
          </div>
        ))}

        {/* ─── Add sort button ─── */}
        <button onClick={() => setShowAddPicker(true)}
          className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors", slots?.addSortButton)}>
          <Plus className={cn("w-4 h-4")} /><span>Add a sort</span>
        </button>

        {/* ─── Delete all button (only if sorts exist) ─── */}
        {sorts.length > 0 && (
          <button onClick={() => clearSorts(viewId)}
            className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors", slots?.deleteSortButton)}>
            <Trash2 className={cn("w-4 h-4")} /><span>Delete sort</span>
          </button>
        )}
      </div>

      {/* ─── Property picker overlay ─── */}
      {showAddPicker && (
        <div className={cn("border-t border-line-light", slots?.pickerWrap)}>
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
