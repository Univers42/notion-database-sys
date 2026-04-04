/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalloutBlockReadOnly.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { Block } from '@src/types/database';

export const CALLOUT_COLORS: Record<string, { bg: string; border: string }> = {
  '💡': { bg: 'bg-amber-50',  border: 'border-amber-200' },
  '⚠️': { bg: 'bg-amber-50',  border: 'border-amber-300' },
  '❗': { bg: 'bg-red-50',    border: 'border-red-200' },
  '📌': { bg: 'bg-blue-50',   border: 'border-blue-200' },
  '✅': { bg: 'bg-green-50',  border: 'border-green-200' },
  '❌': { bg: 'bg-red-50',    border: 'border-red-200' },
  'ℹ️': { bg: 'bg-blue-50',   border: 'border-blue-200' },
  '🔥': { bg: 'bg-orange-50', border: 'border-orange-200' },
  '💬': { bg: 'bg-gray-50',   border: 'border-gray-200' },
  '📝': { bg: 'bg-purple-50', border: 'border-purple-200' },
  '🎯': { bg: 'bg-indigo-50', border: 'border-indigo-200' },
  '⭐': { bg: 'bg-amber-50',  border: 'border-amber-200' },
};

export const CalloutBlockReadOnly: React.FC<{ block: Block }> = ({ block }) => {
  const icon = block.color || '💡';
  const colors = CALLOUT_COLORS[icon] || { bg: 'bg-[var(--color-surface-secondary)]', border: 'border-[var(--color-line)]' };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border my-0.5 ${colors.bg} ${colors.border}`}>
      <span className="text-lg shrink-0">{icon}</span>
      <span className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5 flex-1">{block.content}</span>
    </div>
  );
};
