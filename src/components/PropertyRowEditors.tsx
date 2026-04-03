import React from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '../utils/cn';

// ─── Read-only property renderers ───────────────────────────────────────────

export function ReadOnlyText({ value, fallback = '—' }: Readonly<{ value: unknown; fallback?: string }>) {
  return <span className={cn("text-sm text-ink-secondary px-2")}>{typeof value === 'string' && value ? value : fallback}</span>;
}

export function ReadOnlyTime({ iso }: Readonly<{ iso: string | undefined }>) {
  return <span className={cn("text-sm text-ink-secondary px-2")}>{iso ? format(parseISO(iso), 'MMM d, yyyy h:mm a') : '-'}</span>;
}

// ─── Editable property renderers ────────────────────────────────────────────

const inputTypeMap: Record<string, string> = { email: 'email', url: 'url' };

export function TextEditor({ value, onChange, type }: Readonly<{ value: string; onChange: (v: string) => void; type?: string }>) {
  return (
    <input
      type={inputTypeMap[type ?? ''] || 'text'}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={cn("flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface")}
      placeholder="Empty"
    />
  );
}

export function NumberEditor({ value, onChange }: Readonly<{ value: number | null; onChange: (v: number | null) => void }>) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      className={cn("flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface tabular-nums")}
      placeholder="Empty"
    />
  );
}

export function SelectEditor({ value, options, onChange }: {
  value: string;
  options: { id: string; value: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      className={cn("flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface")}
    >
      <option value="">Empty</option>
      {options.map(opt => <option key={opt.id} value={opt.id}>{opt.value}</option>)}
    </select>
  );
}

export function MultiSelectEditor({ value, options, onChange }: {
  value: string[];
  options: { id: string; value: string; color: string }[];
  onChange: (v: string[]) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className={cn("flex-1 flex flex-wrap items-center gap-1 px-2 py-1")}>
      {selected.map(id => {
        const opt = options.find(o => o.id === id);
        return opt ? (
          <span key={id} className={cn(`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`)}>
            {opt.value}
            <button onClick={() => onChange(selected.filter(s => s !== id))} className={cn("hover:text-hover-danger-text-bold")}>×</button>
          </span>
        ) : null;
      })}
      <select
        value=""
        onChange={e => { if (e.target.value && !selected.includes(e.target.value)) onChange([...selected, e.target.value]); }}
        className={cn("text-xs text-ink-muted bg-transparent outline-none")}
      >
        <option value="">+ Add</option>
        {options.filter(o => !selected.includes(o.id)).map(opt => (
          <option key={opt.id} value={opt.id}>{opt.value}</option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxEditor({ value, onChange }: Readonly<{ value: boolean; onChange: (v: boolean) => void }>) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        value ? 'bg-accent border-accent-border' : 'border-line-medium hover:border-hover-border-strong'
      }`)}
    >
      {value && <span className={cn("text-ink-inverse text-xs")}>✓</span>}
    </button>
  );
}

export function DateEditor({ value, onChange }: Readonly<{ value: string; onChange: (v: string | null) => void }>) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      className={cn("flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface")}
    />
  );
}

export function PlaceEditor({ value, onChange }: Readonly<{ value: unknown; onChange: (v: { address: string }) => void }>) {
  const placeVal = typeof value === 'object' && value ? (value as { address?: string }) : null;
  return (
    <input
      type="text"
      value={placeVal?.address || (typeof value === 'string' ? value : '')}
      onChange={e => onChange({ address: e.target.value })}
      className={cn("flex-1 text-sm text-ink outline-none bg-transparent px-2 py-1 rounded hover:bg-hover-surface focus:bg-focus-surface")}
      placeholder="Address..."
    />
  );
}
