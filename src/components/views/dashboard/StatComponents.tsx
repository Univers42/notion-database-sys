/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   StatComponents.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:37 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:37:38 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { formatNumber } from './constants';

// ─── StatIconBadge ───────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-accent-soft text-accent-text-light',
  purple: 'bg-purple-surface text-purple-text',
  green: 'bg-success-surface text-success-text',
  amber: 'bg-amber-surface text-amber-text',
  pink: 'bg-pink-surface text-pink-text',
  cyan: 'bg-cyan-surface text-cyan-text',
};

export function StatIconBadge({ color, children }: Readonly<{ color: string; children: React.ReactNode }>) {
  return <div className={`p-2.5 rounded-lg ${COLOR_MAP[color] || COLOR_MAP.blue}`}>{children}</div>;
}

// ─── StatCard ────────────────────────────────────────────────────────────────

export function StatCard({ icon, label, value, subtext, color }: Readonly<{
  icon: React.ReactNode; label: string; value: number; subtext?: string;
  color: 'blue' | 'purple' | 'green' | 'amber' | 'pink' | 'cyan';
}>) {
  return (
    <div className="bg-surface-primary rounded-xl border border-line p-4 flex items-start gap-3">
      <StatIconBadge color={color}>{icon}</StatIconBadge>
      <div>
        <div className="text-2xl font-bold text-ink tabular-nums leading-none mb-1">{formatNumber(value)}</div>
        <div className="text-xs text-ink-secondary">{label}</div>
        {subtext && <div className="text-xs text-ink-muted mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}

// ─── EmptyWidget ─────────────────────────────────────────────────────────────

export function EmptyWidget({ title, message }: Readonly<{ title: string; message: string }>) {
  return (
    <div className="p-5 h-full flex flex-col items-center justify-center text-ink-muted">
      <BarChart3 className="w-8 h-8 mb-2 text-ink-disabled" />
      <div className="text-xs font-medium">{title}</div>
      <div className="text-[10px] mt-1">{message}</div>
    </div>
  );
}
