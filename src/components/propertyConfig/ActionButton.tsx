import React from 'react';

export function ActionButton({ icon, label, onClick, disabled, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${disabled
        ? 'text-ink-disabled cursor-not-allowed'
        : danger
          ? 'text-danger-text hover:bg-hover-danger'
          : 'text-ink-body hover:bg-hover-surface'
        }`}>
      <span className={disabled ? 'text-ink-disabled' : danger ? 'text-danger-text-soft' : 'text-ink-muted'}>{icon}</span>
      {label}
    </button>
  );
}
