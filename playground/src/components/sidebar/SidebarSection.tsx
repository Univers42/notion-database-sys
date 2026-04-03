import React, { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';

interface Props {
  label:         string;
  children?:     React.ReactNode;
  defaultOpen?:  boolean;
  onAdd?:        () => void;     // shows a "+" button on hover when provided
}

/**
 * Collapsible section header used to group rows in the sidebar.
 * Shows a chevron and optional "+" button on hover.
 */
export const SidebarSection: React.FC<Props> = ({
  label, children, defaultOpen = true, onAdd,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-3">
      {/* Section header row */}
      <div className="group relative flex items-center h-6 mb-0.5 px-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 flex-1 min-w-0"
        >
          <ChevronRight
            size={12}
            className={[
              'text-[var(--color-ink-faint)] shrink-0 transition-transform duration-150',
              open ? 'rotate-90' : '',
            ].join(' ')}
          />
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-muted)] truncate">
            {label}
          </span>
        </button>

        {onAdd && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className={[
              'absolute right-2 p-0.5 rounded',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-100',
              'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-hover)]',
            ].join(' ')}
            title={`Add to ${label}`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Content (collapsed → nothing rendered) */}
      {open && <div className="flex flex-col gap-px">{children}</div>}
    </div>
  );
};
