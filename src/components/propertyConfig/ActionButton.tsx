import React from 'react';

function getButtonStyle(disabled?: boolean, danger?: boolean): string {
  if (disabled) return 'text-ink-disabled cursor-not-allowed';
  if (danger) return 'text-danger-text hover:bg-hover-danger';
  return 'text-ink-body hover:bg-hover-surface';
}

function getIconColor(disabled?: boolean, danger?: boolean): string {
  if (disabled) return 'text-ink-disabled';
  if (danger) return 'text-danger-text-soft';
  return 'text-ink-muted';
}

export function ActionButton({ icon, label, onClick, disabled, danger }: Readonly<{
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${getButtonStyle(disabled, danger)}`}>
      <span className={getIconColor(disabled, danger)}>{icon}</span>
      {label}
    </button>
  );
}
