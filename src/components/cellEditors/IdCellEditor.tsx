import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import type { SchemaProperty } from '../../types/database';
import { Fingerprint } from 'lucide-react';
import { CellPortal } from './CellPortal';
import type { IdFormat } from './constants';

interface IdCellEditorProps {
  property: SchemaProperty;
  value: any;
  databaseId: string;
  onClose: () => void;
}

export function IdCellEditor({ property, databaseId, value, onClose }: IdCellEditorProps) {
  const updateProperty = useDatabaseStore(s => s.updateProperty);

  const currentPrefix = property.prefix || '';
  const currentCounter = property.autoIncrement || 1;

  const inferFormat = (): IdFormat => {
    if (currentPrefix && currentCounter) return 'prefixed';
    return 'auto_increment';
  };

  const [format, setFormat] = useState<IdFormat>(inferFormat);
  const [prefix, setPrefix] = useState(currentPrefix);

  const handleSave = (newFormat: IdFormat, newPrefix?: string) => {
    const p = newPrefix ?? prefix;
    const updates: Record<string, any> = {};
    switch (newFormat) {
      case 'auto_increment': Object.assign(updates, { prefix: '', autoIncrement: currentCounter }); break;
      case 'prefixed': Object.assign(updates, { prefix: p || 'ID-', autoIncrement: currentCounter }); break;
      case 'uuid': Object.assign(updates, { prefix: 'uuid', autoIncrement: undefined }); break;
      case 'custom': Object.assign(updates, { prefix: '', autoIncrement: undefined }); break;
    }
    updateProperty(databaseId, property.id, updates);
  };

  return (
    <CellPortal onClose={onClose} minWidth={260}>
      <CurrentValueHeader value={value} />
      <FormatPicker format={format} prefix={prefix} onSelect={f => { setFormat(f); handleSave(f); }} />
      {format === 'prefixed' && (
        <PrefixInput prefix={prefix} setPrefix={setPrefix} currentCounter={currentCounter}
          onSave={p => handleSave('prefixed', p)} onClose={onClose} />
      )}
      {(format === 'auto_increment' || format === 'prefixed') && (
        <CounterInfo currentCounter={currentCounter} />
      )}
    </CellPortal>
  );
}

function CurrentValueHeader({ value }: { value: any }) {
  return (
    <div className="px-3 py-2 bg-surface-secondary border-b border-line-light">
      <div className="flex items-center gap-2">
        <Fingerprint className="w-4 h-4 text-ink-muted" />
        <span className="text-sm font-mono text-ink-body-light">{value || '—'}</span>
      </div>
    </div>
  );
}

const FORMAT_OPTIONS: { value: IdFormat; label: string; desc: string }[] = [
  { value: 'auto_increment', label: 'Auto-increment', desc: 'Sequential numbers' },
  { value: 'prefixed', label: 'Prefixed ID', desc: 'Prefix + sequential' },
  { value: 'uuid', label: 'UUID', desc: 'Unique random ID' },
  { value: 'custom', label: 'Custom', desc: 'Manual values' },
];

function getExample(f: IdFormat, prefix: string): string {
  switch (f) {
    case 'auto_increment': return 'e.g. 1, 2, 3…';
    case 'prefixed': return `e.g. ${prefix || 'TASK-'}1, ${prefix || 'TASK-'}2…`;
    case 'uuid': return 'e.g. a1b2c3d4…';
    case 'custom': return 'Enter manually';
  }
}

function FormatPicker({ format, prefix, onSelect }: { format: IdFormat; prefix: string; onSelect: (f: IdFormat) => void }) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5 text-xs font-medium text-ink-muted uppercase tracking-wide">ID Format</div>
      {FORMAT_OPTIONS.map(f => (
        <button key={f.value} onClick={() => onSelect(f.value)}
          className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-hover-surface transition-colors ${format === f.value ? 'bg-accent-soft2' : ''}`}>
          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${format === f.value ? 'border-accent-border' : 'border-line-medium'}`}>
            {format === f.value && <div className="w-2 h-2 rounded-full bg-accent" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-body">{f.label}</div>
            <div className="text-xs text-ink-muted">{f.desc}</div>
            <div className="text-xs text-ink-disabled mt-0.5 font-mono">{getExample(f.value, prefix)}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function PrefixInput({ prefix, setPrefix, currentCounter, onSave, onClose }: {
  prefix: string; setPrefix: (s: string) => void; currentCounter: number;
  onSave: (p: string) => void; onClose: () => void;
}) {
  return (
    <div className="px-3 py-2 border-t border-line-light">
      <label className="text-xs font-medium text-ink-secondary mb-1 block">Prefix</label>
      <input autoFocus type="text" value={prefix} onChange={e => setPrefix(e.target.value)}
        onBlur={() => onSave(prefix)}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(prefix); onClose(); } }}
        className="w-full text-sm px-2.5 py-1.5 rounded-md border border-line bg-surface-secondary-soft outline-none focus:border-focus-border focus:bg-surface-primary transition-colors font-mono"
        placeholder="TASK-" />
      <div className="text-xs text-ink-muted mt-1">
        Next ID: <span className="font-mono">{prefix || 'ID-'}{currentCounter}</span>
      </div>
    </div>
  );
}

function CounterInfo({ currentCounter }: { currentCounter: number }) {
  return (
    <div className="px-3 py-2 border-t border-line-light bg-surface-secondary-soft">
      <div className="text-xs text-ink-muted">
        Next auto-increment: <span className="font-mono font-medium text-ink-body-light">{currentCounter}</span>
      </div>
    </div>
  );
}
