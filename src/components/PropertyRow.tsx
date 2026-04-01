// ═══════════════════════════════════════════════════════════════════════════════
// PropertyRow — renders a single property label + editor in the page modal
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Hash } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { PropIcon } from '../constants/propertyIcons';
import type { SchemaProperty, DatabaseSchema, Page } from '../types/database';

// ─── Read-only property renderers ───────────────────────────────────────────

function ReadOnlyText({ value, fallback = '—' }: { value: unknown; fallback?: string }) {
  return <span className="text-sm text-ink-secondary px-2">{typeof value === 'string' && value ? value : fallback}</span>;
}

function ReadOnlyTime({ iso }: { iso: string | undefined }) {
  return <span className="text-sm text-ink-secondary px-2">{iso ? format(parseISO(iso), 'MMM d, yyyy h:mm a') : '-'}</span>;
}

// ─── Editable property renderers ────────────────────────────────────────────

function TextEditor({ value, onChange, type }: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type === 'email' ? 'email' : type === 'url' ? 'url' : 'text'}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface"
      placeholder="Empty"
    />
  );
}

function NumberEditor({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface tabular-nums"
      placeholder="Empty"
    />
  );
}

function SelectEditor({ value, options, onChange }: {
  value: string;
  options: { id: string; value: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface"
    >
      <option value="">Empty</option>
      {options.map(opt => <option key={opt.id} value={opt.id}>{opt.value}</option>)}
    </select>
  );
}

function MultiSelectEditor({ value, options, onChange }: {
  value: string[];
  options: { id: string; value: string; color: string }[];
  onChange: (v: string[]) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="flex-1 flex flex-wrap items-center gap-1 px-2 py-1">
      {selected.map(id => {
        const opt = options.find(o => o.id === id);
        return opt ? (
          <span key={id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>
            {opt.value}
            <button onClick={() => onChange(selected.filter(s => s !== id))} className="hover:text-hover-danger-text-bold">×</button>
          </span>
        ) : null;
      })}
      <select
        value=""
        onChange={e => { if (e.target.value && !selected.includes(e.target.value)) onChange([...selected, e.target.value]); }}
        className="text-xs text-ink-muted bg-transparent outline-none"
      >
        <option value="">+ Add</option>
        {options.filter(o => !selected.includes(o.id)).map(opt => (
          <option key={opt.id} value={opt.id}>{opt.value}</option>
        ))}
      </select>
    </div>
  );
}

function CheckboxEditor({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        value ? 'bg-accent border-accent-border' : 'border-line-medium hover:border-hover-border-strong'
      }`}
    >
      {value && <span className="text-ink-inverse text-xs">✓</span>}
    </button>
  );
}

function DateEditor({ value, onChange }: { value: string; onChange: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface"
    />
  );
}

function PlaceEditor({ value, onChange }: { value: unknown; onChange: (v: { address: string }) => void }) {
  const placeVal = typeof value === 'object' && value ? (value as { address?: string }) : null;
  return (
    <input
      type="text"
      value={placeVal?.address || (typeof value === 'string' ? value : '')}
      onChange={e => onChange({ address: e.target.value })}
      className="flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface"
      placeholder="Address..."
    />
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function PropertyRow({ prop, page, pageId, database }: {
  prop: SchemaProperty;
  page: Page;
  pageId: string;
  database: DatabaseSchema;
}) {
  const { updatePageProperty } = useDatabaseStore.getState();
  const val = page.properties[prop.id];
  const update = (v: unknown) => updatePageProperty(pageId, prop.id, v);

  const editor = renderPropertyEditor(prop, val, page, update);

  return (
    <div className="flex items-center gap-3 py-1.5 group hover:bg-hover-surface -mx-3 px-3 rounded-lg transition-colors">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <span className="text-ink-muted"><PropIcon type={prop.type} className="w-3.5 h-3.5" /></span>
        <span className="text-sm text-ink-secondary truncate">{prop.name}</span>
      </div>
      {editor}
    </div>
  );
}

// ─── Editor dispatcher ──────────────────────────────────────────────────────

function renderPropertyEditor(
  prop: SchemaProperty,
  val: unknown,
  page: Page,
  update: (v: unknown) => void,
): React.ReactNode {
  switch (prop.type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      return <TextEditor value={val as string} onChange={update} type={prop.type} />;
    case 'number':
      return <NumberEditor value={val as number | null} onChange={update} />;
    case 'select':
    case 'status':
      return <SelectEditor value={val as string} options={prop.options ?? []} onChange={update} />;
    case 'multi_select':
      return <MultiSelectEditor value={val as string[]} options={(prop.options ?? []) as { id: string; value: string; color: string }[]} onChange={update} />;
    case 'date':
      return <DateEditor value={val as string} onChange={update} />;
    case 'checkbox':
      return <CheckboxEditor value={!!val} onChange={update} />;
    case 'user':
    case 'person':
      return <TextEditor value={val as string} onChange={update} />;
    case 'place':
      return <PlaceEditor value={val} onChange={update} />;
    case 'id':
      return <ReadOnlyText value={val} />;
    case 'files_media':
      return <span className="text-sm text-ink-muted italic px-2">{Array.isArray(val) && val.length > 0 ? `${val.length} file(s)` : 'No files'}</span>;
    case 'button':
      return (
        <button className="px-3 py-1 bg-surface-tertiary hover:bg-hover-surface3 text-xs font-medium text-ink-body rounded-md transition-colors">
          {prop.buttonConfig?.label || 'Click'}
        </button>
      );
    case 'created_time':
      return <ReadOnlyTime iso={page.createdAt} />;
    case 'last_edited_time':
      return <ReadOnlyTime iso={page.updatedAt} />;
    case 'created_by':
      return <ReadOnlyText value={page.createdBy} />;
    case 'last_edited_by':
      return <ReadOnlyText value={page.lastEditedBy} />;
    default:
      return <span className="text-sm text-ink-muted px-2">—</span>;
  }
}
