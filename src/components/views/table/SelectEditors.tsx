// ═══════════════════════════════════════════════════════════════════════════════
// Portal-based Select / MultiSelect editors for table cells
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { randomTagColor } from '../../../constants/colors';
import { SchemaProperty } from '../../../types/database';
import { CheckCircle2, Plus } from 'lucide-react';

interface EditorProps {
  property: SchemaProperty;
  value: any;
  onUpdate: (v: any) => void;
  onClose: () => void;
  databaseId: string;
}

/** Measures the parent `<td>` rect for portal positioning. */
function useTdRect(ref: React.RefObject<HTMLDivElement | null>) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (ref.current) {
      const td = ref.current.closest('td');
      if (td) setRect(td.getBoundingClientRect());
    }
  }, [ref]);
  return rect;
}

// ─── SELECT EDITOR ───────────────────────────────────────────────────────────

export function SelectEditor({ property, value, onUpdate, onClose, databaseId }: EditorProps) {
  const [input, setInput] = useState('');
  const measureRef = useRef<HTMLDivElement>(null);
  const rect = useTdRect(measureRef);
  const addSelectOption = useDatabaseStore(s => s.addSelectOption);

  const options = property.options || [];
  const filtered = options.filter(o => o.value.toLowerCase().includes(input.toLowerCase()));
  const exact = options.find(o => o.value.toLowerCase() === input.toLowerCase());

  const handleSelect = (optId: string) => { onUpdate(optId); onClose(); };

  const handleCreate = () => {
    if (!input.trim() || exact) return;
    const id = `opt-${Date.now()}`;
    addSelectOption(databaseId, property.id, { id, value: input.trim(), color: randomTagColor() });
    onUpdate(id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') exact ? handleSelect(exact.id) : input.trim() && handleCreate();
    if (e.key === 'Escape') onClose();
  };

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={e => { e.stopPropagation(); onClose(); }} />
          <div className="fixed min-w-[220px] bg-surface-primary shadow-xl border border-line rounded-lg z-[9999] overflow-hidden"
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 220) }}
            onClick={e => e.stopPropagation()}>
            <div className="p-2 border-b border-line-light">
              <input autoFocus value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                className="w-full text-sm px-2 py-1.5 bg-surface-secondary rounded outline-none focus:ring-1 ring-ring-accent" placeholder="Search or create..." />
            </div>
            <div className="max-h-52 overflow-y-auto p-1">
              {value && (
                <button onClick={() => { onUpdate(null); onClose(); }} className="w-full px-2 py-1.5 hover:bg-hover-surface text-sm text-ink-secondary text-left rounded">
                  Clear selection
                </button>
              )}
              {filtered.map(opt => (
                <button key={opt.id} onClick={() => handleSelect(opt.id)}
                  className="w-full px-2 py-1.5 hover:bg-hover-surface text-sm text-left rounded flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span>
                  {opt.id === value && <CheckCircle2 className="w-3.5 h-3.5 text-accent-text-soft ml-auto" />}
                </button>
              ))}
              {input.trim() && !exact && (
                <button onClick={handleCreate}
                  className="w-full px-2 py-1.5 hover:bg-hover-surface text-sm text-left rounded flex items-center gap-2 text-ink-body-light">
                  <Plus className="w-3.5 h-3.5" /> Create <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-tertiary">"{input}"</span>
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ─── MULTI-SELECT EDITOR ─────────────────────────────────────────────────────

export function MultiSelectEditor({ property, value, onUpdate, onClose, databaseId }: EditorProps) {
  const [input, setInput] = useState('');
  const measureRef = useRef<HTMLDivElement>(null);
  const rect = useTdRect(measureRef);
  const addSelectOption = useDatabaseStore(s => s.addSelectOption);

  const options = property.options || [];
  const selectedIds: string[] = Array.isArray(value) ? value : [];
  const unselected = options.filter(o => !selectedIds.includes(o.id));
  const filtered = unselected.filter(o => o.value.toLowerCase().includes(input.toLowerCase()));
  const exact = options.find(o => o.value.toLowerCase() === input.toLowerCase());

  const toggle = (optId: string) => {
    const next = selectedIds.includes(optId) ? selectedIds.filter(id => id !== optId) : [...selectedIds, optId];
    onUpdate(next);
    setInput('');
  };

  const handleCreate = () => {
    if (!input.trim() || exact) return;
    const id = `opt-${Date.now()}`;
    addSelectOption(databaseId, property.id, { id, value: input.trim(), color: randomTagColor() });
    onUpdate([...selectedIds, id]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') exact ? toggle(exact.id) : input.trim() && handleCreate();
    if (e.key === 'Escape') onClose();
    if (e.key === 'Backspace' && !input && selectedIds.length) onUpdate(selectedIds.slice(0, -1));
  };

  return (
    <>
      <div ref={measureRef} className="w-full h-0" />
      {rect && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={e => { e.stopPropagation(); onClose(); }} />
          <div className="fixed min-w-[220px] bg-surface-primary shadow-xl border border-line rounded-lg z-[9999] overflow-hidden"
            style={{ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 220) }}
            onClick={e => e.stopPropagation()}>
            <div className="p-2 border-b border-line-light">
              <div className="flex flex-wrap gap-1 mb-1">
                {selectedIds.map(id => {
                  const opt = options.find(o => o.id === id);
                  if (!opt) return null;
                  return (
                    <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${opt.color}`}>
                      {opt.value}
                      <button onClick={() => toggle(id)} className="hover:opacity-60">&times;</button>
                    </span>
                  );
                })}
              </div>
              <input autoFocus value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                className="w-full text-sm px-1 py-1 outline-none bg-transparent" placeholder={selectedIds.length ? '' : 'Search or create...'} />
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.map(opt => (
                <button key={opt.id} onClick={() => toggle(opt.id)}
                  className="w-full px-2 py-1.5 hover:bg-hover-surface text-sm text-left rounded flex items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span>
                </button>
              ))}
              {input.trim() && !exact && (
                <button onClick={handleCreate}
                  className="w-full px-2 py-1.5 hover:bg-hover-surface text-sm text-left rounded flex items-center gap-2 text-ink-body-light">
                  <Plus className="w-3.5 h-3.5" /> Create "{input}"
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
