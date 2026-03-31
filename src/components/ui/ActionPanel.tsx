import React, { useState, useRef, useEffect, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// ActionPanel — a declarative, config-driven action menu.
//
// Pass an array of sections. Each section has items. Items can be:
//   • 'action'  — icon + label + optional shortcut + onClick
//   • 'toggle'  — icon + label + toggle switch
//   • 'link'    — icon + label + href (external link)
//   • 'info'    — plain text info line (e.g. "Last edited by…")
//
// Sections are automatically separated by dividers. If you add more sections
// the component handles layout responsively — no hardcoding needed.
// ═══════════════════════════════════════════════════════════════════════════════

/* ─── Public types ──────────────────────────────────────────────────────── */

export interface ActionItem {
  type?: 'action';
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  danger?: boolean;
  /** Highlight this row (e.g. with a tinted background) */
  active?: boolean;
}

export interface ToggleItem {
  type: 'toggle';
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}

export interface LinkItem {
  type: 'link';
  icon?: React.ReactNode;
  label: string;
  href: string;
  /** Open in new tab (default true) */
  external?: boolean;
  muted?: boolean;
}

export interface InfoItem {
  type: 'info';
  /** Multiple lines are rendered stacked */
  lines: string[];
}

export type PanelItem = ActionItem | ToggleItem | LinkItem | InfoItem;

export interface PanelSection {
  /** Optional label rendered above the section */
  label?: string;
  items: PanelItem[];
}

export interface ActionPanelProps {
  /** Array of sections — each rendered with items, separated by dividers */
  sections: PanelSection[];
  /** Show a search input at the top. Items are filtered by label. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Width of the panel (default 265) */
  width?: number;
  /** Extra className on the outermost wrapper */
  className?: string;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ActionPanel({
  sections,
  searchable = false,
  searchPlaceholder = 'Search actions…',
  width = 265,
  className = '',
}: ActionPanelProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchable && inputRef.current) inputRef.current.focus();
  }, [searchable]);

  /* Filter sections/items when search is active */
  const filtered: PanelSection[] = useMemo(() => {
    if (!query.trim()) return sections;
    const q = query.toLowerCase();
    return sections
      .map(s => ({
        ...s,
        items: s.items.filter(item => {
          if (item.type === 'info') return item.lines.some(l => l.toLowerCase().includes(q));
          return (item as any).label?.toLowerCase().includes(q);
        }),
      }))
      .filter(s => s.items.length > 0);
  }, [sections, query]);

  return (
    <div
      className={`flex flex-col bg-surface-primary border border-line rounded-xl shadow-lg overflow-hidden ${className}`}
      style={{ width, minWidth: 180, maxWidth: 'calc(100vw - 24px)' }}
    >
      <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
        {/* ── Search ── */}
        {searchable && (
          <div className="shrink-0 px-2 pt-2 pb-1">
            <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface-secondary-soft3 px-2 h-7">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-placeholder text-ink-strong"
              />
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {filtered.map((section, si) => (
            <div key={si}>
              {/* Divider between sections (not before first) */}
              {si > 0 && <SectionDivider />}

              <div className="flex flex-col gap-px p-1">
                {/* Section label */}
                {section.label && (
                  <div className="flex items-center px-2 mt-1.5 mb-2 text-xs font-medium leading-[1.2] text-ink-secondary select-none">
                    <span className="truncate">{section.label}</span>
                  </div>
                )}

                {/* Items */}
                {section.items.map((item, ii) => (
                  <PanelItemRow key={ii} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Individual item renderer ─────────────────────────────────────────── */

function PanelItemRow({ item }: { item: PanelItem }) {
  if (item.type === 'info') return <InfoRow item={item} />;
  if (item.type === 'toggle') return <ToggleRow item={item} />;
  if (item.type === 'link') return <LinkRow item={item} />;
  return <ActionRow item={item} />;
}

/* Action row: icon + label + optional shortcut */
function ActionRow({ item }: { item: ActionItem }) {
  return (
    <button
      onClick={item.onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-[5px] text-sm rounded-md transition-colors
        ${item.danger
          ? 'text-danger-text hover:bg-hover-danger'
          : item.active
            ? 'bg-surface-tertiary-soft2 text-ink'
            : 'text-ink-body hover:bg-hover-surface-soft2'
        }`}
    >
      {item.icon && (
        <span className={`flex items-center justify-center shrink-0 w-5 h-5 ${item.danger ? 'text-danger-text-soft' : 'text-ink-secondary'}`}>
          {item.icon}
        </span>
      )}
      <span className="flex-1 text-left truncate">{item.label}</span>
      {item.shortcut && (
        <span className="shrink-0 text-xs text-ink-muted whitespace-nowrap">{item.shortcut}</span>
      )}
    </button>
  );
}

/* Toggle row: icon + label + toggle switch */
function ToggleRow({ item }: { item: ToggleItem }) {
  return (
    <button
      onClick={() => item.onToggle(!item.checked)}
      className="w-full flex items-center gap-2.5 px-2 py-[5px] text-sm rounded-md text-ink-body hover:bg-hover-surface-soft2 transition-colors"
    >
      {item.icon && (
        <span className="flex items-center justify-center shrink-0 w-5 h-5 text-ink-secondary">
          {item.icon}
        </span>
      )}
      <span className="flex-1 text-left truncate">{item.label}</span>
      <span className="shrink-0 ml-2">
        <ToggleSwitch checked={item.checked} />
      </span>
    </button>
  );
}

/* Link row: icon + label, rendered as <a> */
function LinkRow({ item }: { item: LinkItem }) {
  return (
    <a
      href={item.href}
      target={item.external !== false ? '_blank' : undefined}
      rel={item.external !== false ? 'noopener noreferrer' : undefined}
      className="w-full flex items-center gap-2.5 px-2 py-[5px] text-sm rounded-md text-ink-body hover:bg-hover-surface-soft2 transition-colors no-underline"
    >
      {item.icon && (
        <span className={`flex items-center justify-center shrink-0 w-5 h-5 ${item.muted ? 'text-ink-muted' : 'text-ink-secondary'}`}>
          {item.icon}
        </span>
      )}
      <span className={`flex-1 text-left truncate ${item.muted ? 'text-ink-muted' : ''}`}>{item.label}</span>
    </a>
  );
}

/* Info row: plain text lines */
function InfoRow({ item }: { item: InfoItem }) {
  return (
    <div className="px-2 py-1">
      {item.lines.map((line, i) => (
        <div key={i} className="text-xs text-ink-muted leading-5 truncate">{line}</div>
      ))}
    </div>
  );
}

/* ─── Small helpers ────────────────────────────────────────────────────── */

function SectionDivider() {
  return (
    <div className="relative mt-px">
      <div className="absolute top-0 left-3 right-3 h-px bg-surface-muted-soft" />
    </div>
  );
}

function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center rounded-full p-[2px] transition-colors"
      style={{
        width: 30,
        height: 18,
        background: checked ? 'var(--color-toggle-on)' : 'var(--color-toggle-shadow)',
      }}
    >
      <div
        className="rounded-full bg-surface-primary transition-transform"
        style={{
          width: 14,
          height: 14,
          transform: checked ? 'translateX(12px)' : 'translateX(0)',
        }}
      />
    </div>
  );
}
