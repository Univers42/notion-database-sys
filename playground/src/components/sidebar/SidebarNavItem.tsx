import React from 'react';

interface Props {
  icon:     React.ReactNode;
  label:    string;
  count?:   number;
  active?:  boolean;
  indent?:  number;                  // 0 = top-level
  onClick:  () => void;
}

/**
 * A single 28 px-tall row in the Notion-style left sidebar.
 * Hover  → bg-[var(--color-surface-hover)]
 * Active → bg-[var(--color-surface-tertiary)] text-[var(--color-ink)]
 */
export const SidebarNavItem: React.FC<Props> = ({
  icon, label, count, active = false, indent = 0, onClick,
}) => {
  const paddingLeft = 12 + indent * 12;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-1.5 h-7 rounded-md text-sm select-none',
        'transition-colors duration-100 cursor-pointer',
        active
          ? 'bg-[var(--color-surface-tertiary)] text-[var(--color-ink)]'
          : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]',
      ].join(' ')}
      style={{ paddingLeft, paddingRight: 8 }}
    >
      {/* Icon slot: fixed 18 × 18 */}
      <span className="flex items-center justify-center w-[18px] h-[18px] shrink-0 opacity-70">
        {icon}
      </span>

      <span className="flex-1 text-left truncate">{label}</span>

      {count !== undefined && count > 0 && (
        <span className="text-xs font-medium text-[var(--color-ink-muted)]">
          {count}
        </span>
      )}
    </button>
  );
};
