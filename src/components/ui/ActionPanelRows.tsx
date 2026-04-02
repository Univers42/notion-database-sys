/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ActionPanelRows.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:02 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:35:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// ActionPanel row renderers — split from ActionPanel.tsx
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { ActionItem, ToggleItem, LinkItem, InfoItem, PanelItem } from './ActionPanel';

/* ─── Item dispatcher ──────────────────────────────────────────────────── */

export function PanelItemRow({ item }: Readonly<{ item: PanelItem }>) {
  if (item.type === 'info') return <InfoRow item={item} />;
  if (item.type === 'toggle') return <ToggleRow item={item} />;
  if (item.type === 'link') return <LinkRow item={item} />;
  return <ActionRow item={item} />;
}

/* Action row: icon + label + optional shortcut */
function ActionRow({ item }: Readonly<{ item: ActionItem }>) {
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
function ToggleRow({ item }: Readonly<{ item: ToggleItem }>) {
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
function LinkRow({ item }: Readonly<{ item: LinkItem }>) {
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
function InfoRow({ item }: Readonly<{ item: InfoItem }>) {
  return (
    <div className="px-2 py-1">
      {item.lines.map((line, i) => (
        <div key={i} className="text-xs text-ink-muted leading-5 truncate">{line}</div>
      ))}
    </div>
  );
}

/* ─── Small helpers ────────────────────────────────────────────────────── */

export function SectionDivider() {
  return (
    <div className="relative mt-px">
      <div className="absolute top-0 left-3 right-3 h-px bg-surface-muted-soft" />
    </div>
  );
}

export function ToggleSwitch({ checked }: Readonly<{ checked: boolean }>) {
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
