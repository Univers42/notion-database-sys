import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { PICKER_ICON_NAMES } from './iconRegistry';
import { Icon } from './Icon';

// ═══════════════════════════════════════════════════════════════════════════════
// Notion-style Icon Picker — 288 icons in a filterable, portal-rendered grid.
// Renders via portal to avoid parent overflow/clipping issues.
// ═══════════════════════════════════════════════════════════════════════════════

interface IconPickerProps {
  /** Currently selected icon name (kebab-case registry key) */
  value?: string | null;
  /** Called when user picks an icon */
  onSelect: (iconName: string) => void;
  /** Called when user clicks "Remove" */
  onRemove?: () => void;
  /** Called to close the picker */
  onClose?: () => void;
}

/** Human-readable label from kebab key */
function toLabel(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Inner picker panel (no portal logic) ────────────────────────────────────

function IconPickerPanel({
  value,
  onSelect,
  onRemove,
}: IconPickerProps) {
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return PICKER_ICON_NAMES;
    const q = filter.toLowerCase().trim();
    return PICKER_ICON_NAMES.filter(name => name.replace(/-/g, ' ').includes(q));
  }, [filter]);

  const handleRandom = useCallback(() => {
    const idx = Math.floor(Math.random() * PICKER_ICON_NAMES.length);
    onSelect(PICKER_ICON_NAMES[idx]);
  }, [onSelect]);

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full h-full">
      {/* ─── Header ─── */}
      <div className="shrink-0">
        <div className="flex items-center px-2 pt-2">
          <div className="flex items-center">
            <div className="relative">
              <button className="px-2.5 py-1.5 text-sm font-medium text-gray-900 rounded-md">Icon</button>
              <div className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-gray-900 rounded-full" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {onRemove && (
              <button
                onClick={onRemove}
                className="px-2.5 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* ─── Filter + Random ─── */}
        <div className="px-3 pt-1.5 pb-2.5">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md h-7">
              <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 fill-gray-400" aria-hidden="true">
                <path d="M7.1 1.975a5.125 5.125 0 1 0 3.155 9.164l3.107 3.107a.625.625 0 1 0 .884-.884l-3.107-3.107A5.125 5.125 0 0 0 7.1 1.975M3.225 7.1a3.875 3.875 0 1 1 7.75 0 3.875 3.875 0 0 1-7.75 0" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Filter…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 min-w-0"
              />
            </div>
            <button
              onClick={handleRandom}
              className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              title="Random"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M11.982 2.526a.625.625 0 0 0-.884.884l.915.915H10.93a3.83 3.83 0 0 0-3.27 1.837l-.386.635-.388-.637a3.83 3.83 0 0 0-3.268-1.837H2.48a.625.625 0 0 0 0 1.25h1.14c.9 0 1.733.469 2.2 1.237L6.543 8 5.82 9.19a2.58 2.58 0 0 1-2.2 1.237H2.48a.625.625 0 1 0 0 1.25h1.14A3.83 3.83 0 0 0 6.887 9.84l.388-.638.386.636a3.83 3.83 0 0 0 3.268 1.837h1.085l-.916.915a.625.625 0 1 0 .884.884l1.98-1.98a.625.625 0 0 0 0-.884l-1.98-1.98a.625.625 0 0 0-.884.884l.911.91h-1.08a2.58 2.58 0 0 1-2.2-1.236L8.006 8l.723-1.188a2.58 2.58 0 0 1 2.2-1.237h1.08l-.91.911a.625.625 0 1 0 .883.884l1.98-1.98a.625.625 0 0 0 0-.884z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Icon Grid ─── */}
      <div
        className="flex-1 overflow-y-auto min-h-0 px-3 pb-3"
        style={{ maskImage: 'linear-gradient(black 0%, black calc(100% - 24px), transparent 100%)' }}
      >
        <div className="flex items-center px-1 mt-1 mb-1.5 text-xs font-medium text-gray-500 select-none">
          <span>Icons</span>
          <span className="ml-auto text-gray-400 tabular-nums">{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">No icons match "{filter}"</div>
        ) : (
          <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))' }}>
            {filtered.map(name => {
              const isSelected = name === value;
              return (
                <button
                  key={name}
                  onClick={() => onSelect(name)}
                  className={`flex items-center justify-center rounded aspect-square transition-colors ${
                    isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
                  }`}
                  title={toLabel(name)}
                >
                  <Icon name={name} className="w-5 h-5" fill="currentColor" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Portal-based popover wrapper — anchors to a trigger element
// ═══════════════════════════════════════════════════════════════════════════════

interface IconPickerPopoverProps extends IconPickerProps {
  /** The anchor element ref to position near */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Preferred horizontal alignment */
  align?: 'left' | 'right';
}

export function IconPickerPopover({
  anchorRef,
  align = 'left',
  ...pickerProps
}: IconPickerPopoverProps) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 380, height: 340 });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute position on mount and window resize
  useEffect(() => {
    const compute = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 8;

      // Responsive size
      const w = Math.max(260, Math.min(400, vw - pad * 2));
      const h = Math.max(200, Math.min(380, vh - pad * 2));

      // Vertical: prefer below anchor
      let top = rect.bottom + 4;
      if (top + h > vh - pad) {
        top = rect.top - h - 4;
        if (top < pad) top = Math.max(pad, (vh - h) / 2);
      }

      // Horizontal
      let left: number;
      if (align === 'right') {
        left = rect.right - w;
        if (left < pad) left = pad;
      } else {
        left = rect.left;
        if (left + w > vw - pad) left = vw - pad - w;
        if (left < pad) left = pad;
      }

      setPos({ top, left, width: w, height: h });
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [anchorRef, align]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        pickerProps.onClose?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerProps.onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') pickerProps.onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pickerProps.onClose]);

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[9999]"
      style={{ top: pos.top, left: pos.left, width: pos.width, height: pos.height }}
    >
      <IconPickerPanel {...pickerProps} />
    </div>,
    document.body
  );
}

// Re-export the panel as IconPicker for inline use, plus the popover
export { IconPickerPanel as IconPicker };
export default IconPickerPanel;
