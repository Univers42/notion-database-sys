// ─── DbSourceDropdown — database source selector ────────────────────────────
// Dropdown to switch the active database backend.

import React, { useState, useRef, useEffect } from 'react';
import { Database, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react';
import { useDbSource, DB_SOURCE_OPTIONS } from '../hooks/useDbSource.ts';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { DbSourceType } from '../../services/dbms/types.ts';
import { cn } from '../utils/cn';

/** Accent color per source — matches the CSS theme. */
const SOURCE_BADGE: Record<string, string> = {
  json: '#3b82f6',
  csv: '#f59e0b',
  mongodb: '#22c55e',
  postgresql: '#8b5cf6',
};

export function DbSourceDropdown() {
  const activeSource = useDbSource((s) => s.activeSource);
  const switching = useDbSource((s) => s.switching);
  const lastError = useDbSource((s) => s.lastError);
  const setActiveSource = useDbSource((s) => s.setActiveSource);
  const setSwitching = useDbSource((s) => s.setSwitching);
  const setError = useDbSource((s) => s.setError);
  const loadFromSource = useDatabaseStore((s) => s.loadFromSource);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeOption = DB_SOURCE_OPTIONS.find((o) => o.type === activeSource);

  const handleSelect = async (type: DbSourceType) => {
    if (type === activeSource) {
      setOpen(false);
      return;
    }
    setOpen(false);
    setSwitching(true);
    setError(null);
    try {
      await loadFromSource(type);
      setActiveSource(type);
      document.documentElement.setAttribute('data-dbms-source', type);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSwitching(false);
    }
  };

  const badgeColor = SOURCE_BADGE[activeSource] ?? '#3b82f6';

  return (
    <div ref={ref} className={cn("relative")}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(`flex items-center gap-1.5 px-2 py-1 rounded-md
                   text-xs font-medium text-ink-muted
                   hover:bg-hover-surface transition-colors`)}
        title={`Data source: ${activeOption?.label ?? activeSource}`}
      >
        {switching ? (
          <Loader2 className={cn("w-3.5 h-3.5 animate-spin")} />
        ) : (
          <Database className={cn("w-3.5 h-3.5")} />
        )}
        <span
          className={cn("inline-flex items-center gap-1")}
        >
          <span
            className={cn("inline-block w-2 h-2 rounded-full")}
            style={{ backgroundColor: badgeColor }}
          />
          {activeOption?.icon} {activeOption?.label ?? activeSource}
        </span>
        <ChevronDown className={cn("w-3 h-3")} />
      </button>

      {open && (
        <div className={cn(`absolute top-full right-0 mt-1 z-50
                        w-56 rounded-lg border border-line bg-surface-primary
                        shadow-lg py-1`)}>
          <div className={cn(`px-3 py-1.5 text-[10px] font-semibold text-ink-muted
                          uppercase tracking-wider`)}>
            Database Source
          </div>

          {DB_SOURCE_OPTIONS.map((opt) => {
            const optColor = SOURCE_BADGE[opt.type] ?? '#888';
            return (
              <button
                key={opt.type}
                onClick={() => handleSelect(opt.type)}
                className={cn(`w-full flex items-center gap-2 px-3 py-2 text-sm
                           hover:bg-hover-surface transition-colors
                           ${opt.type === activeSource
                             ? 'bg-accent-soft text-accent-text'
                             : 'text-ink-body'}`)}
              >
                <span
                  className={cn("inline-block w-2.5 h-2.5 rounded-full shrink-0")}
                  style={{ backgroundColor: optColor }}
                />
                <span className={cn("text-base")}>{opt.icon}</span>
                <div className={cn("flex-1 text-left")}>
                  <div className={cn("font-medium")}>{opt.label}</div>
                  <div className={cn("text-[10px] text-ink-muted")}>{opt.description}</div>
                </div>
                {opt.type === activeSource && (
                  <Check className={cn("w-4 h-4 text-accent-text")} />
                )}
              </button>
            );
          })}

          {lastError && (
            <div className={cn(`px-3 py-2 flex items-center gap-1.5 text-xs text-danger-text
                            border-t border-line mt-1`)}>
              <AlertCircle className={cn("w-3.5 h-3.5 shrink-0")} />
              <span className={cn("truncate")}>{lastError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
