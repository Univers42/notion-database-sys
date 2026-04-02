import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import type { SchemaProperty } from '../../types/database';
import { Fingerprint } from 'lucide-react';
import { ActionButton } from './ActionButton';

export function IdFormatConfig({ property, databaseId, onClose }: Readonly<{
  property: SchemaProperty; databaseId: string; onClose: () => void;
}>) {
  const { updateProperty, updatePageProperty, pages } = useDatabaseStore();
  const [showIdConfig, setShowIdConfig] = useState(false);
  const [idPrefix, setIdPrefix] = useState(property.prefix || '');
  const [idFormat, setIdFormat] = useState<'auto_increment' | 'prefixed' | 'uuid'>(() => {
    if (property.prefix === 'uuid') return 'uuid';
    if (property.prefix && property.prefix !== 'uuid') return 'prefixed';
    return 'auto_increment';
  });

  return (
    <>
      <div className="py-1 px-1">
        <ActionButton
          icon={<Fingerprint className="w-3.5 h-3.5" />}
          label={showIdConfig ? 'Close ID format' : 'Edit ID format'}
          onClick={() => setShowIdConfig(!showIdConfig)}
        />
      </div>
      {showIdConfig && (
        <div className="px-3 pb-2 space-y-2">
          <div className="text-xs font-medium text-ink-muted uppercase tracking-wide">ID Format</div>
          {([
            { value: 'auto_increment' as const, label: 'Auto-increment', desc: '1, 2, 3…' },
            { value: 'prefixed' as const, label: 'Prefixed', desc: `${idPrefix || 'PREFIX-'}1, ${idPrefix || 'PREFIX-'}2…` },
            { value: 'uuid' as const, label: 'UUID', desc: 'Random unique IDs' },
          ]).map(f => (
            <button
              key={f.value}
              onClick={() => setIdFormat(f.value)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${idFormat === f.value ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'}`}>
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${idFormat === f.value ? 'border-accent-border' : 'border-line-medium'}`}>
                {idFormat === f.value && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
              </div>
              <div>
                <span>{f.label}</span>
                <span className="text-xs text-ink-muted ml-1.5 font-mono">{f.desc}</span>
              </div>
            </button>
          ))}
          {idFormat === 'prefixed' && (
            <div className="pt-1">
              <label className="text-xs text-ink-secondary mb-1 block">Prefix</label>
              <input
                autoFocus
                value={idPrefix}
                onChange={e => setIdPrefix(e.target.value)}
                className="w-full text-sm px-2 py-1.5 rounded-md border border-line bg-surface-secondary outline-none focus:border-focus-border transition-colors font-mono"
                placeholder="TASK-"
              />
            </div>
          )}
          <button
            onClick={() => {
              const dbPages = Object.values(pages).filter(p => p.databaseId === databaseId);
              if (idFormat === 'uuid') {
                updateProperty(databaseId, property.id, { prefix: 'uuid', autoIncrement: undefined });
                dbPages.forEach(p => {
                  const uid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                  updatePageProperty(p.id, property.id, uid.slice(0, 8));
                });
              } else if (idFormat === 'prefixed') {
                const pfx = idPrefix || 'ID-';
                updateProperty(databaseId, property.id, { prefix: pfx, autoIncrement: dbPages.length + 1 });
                dbPages.forEach((p, i) => updatePageProperty(p.id, property.id, `${pfx}${i + 1}`));
              } else {
                updateProperty(databaseId, property.id, { prefix: '', autoIncrement: dbPages.length + 1 });
                dbPages.forEach((p, i) => updatePageProperty(p.id, property.id, String(i + 1)));
              }
              onClose();
            }}
            className="w-full py-1.5 text-sm font-medium text-ink-inverse bg-accent-bold hover:bg-hover-accent-bold rounded-md transition-colors">
            Apply to all records
          </button>
        </div>
      )}
      <div className="h-px bg-surface-tertiary" />
    </>
  );
}
