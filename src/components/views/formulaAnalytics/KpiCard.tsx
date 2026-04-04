/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   KpiCard.tsx                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:49:33 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { STAT_BG } from './constants';
import { cn } from '../../../utils/cn';

export function KpiCard({
  icon,
  color,
  label,
  value,
  subtext,
}: Readonly<{
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number | string;
  subtext?: string;
}>) {
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-4 flex items-start gap-3")}>
      <div className={cn(`p-2.5 rounded-lg ${STAT_BG[color] || STAT_BG.blue}`)}>{icon}</div>
      <div>
        <div className={cn("text-2xl font-bold text-ink tabular-nums leading-none mb-1")}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className={cn("text-xs text-ink-secondary")}>{label}</div>
        {subtext && <div className={cn("text-[10px] text-ink-muted mt-0.5")}>{subtext}</div>}
      </div>
    </div>
  );
}
