/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GalleryViewHelpers.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:38:19 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { format } from 'date-fns';
import type { SchemaProperty, PropertyValue } from '../../../types/database';
import { CARD_COVER_GRADIENTS } from '../../../utils/color';
import { cn } from '../../../utils/cn';
export const coverColors = CARD_COVER_GRADIENTS;

export function renderPropertyValue(prop: SchemaProperty, val: PropertyValue, wrapContent: boolean) {
  if (val === undefined || val === null || val === '') return null;
  if (prop.type === 'select' || prop.type === 'status') {
    const opt = prop.options?.find(o => o.id === val);
    return opt ? <span className={cn(`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`)}>{opt.value}</span> : null;
  }
  if (prop.type === 'multi_select') {
    const ids: string[] = Array.isArray(val) ? val : [];
    return (
      <div className={cn(`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`)}>
        {ids.map(id => {
          const opt = prop.options?.find(o => o.id === id);
          return opt ? <span key={id} className={cn(`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`)}>{opt.value}</span> : null;
        })}
      </div>
    );
  }
  if (prop.type === 'date') return <span className={cn("text-xs text-ink-secondary")}>{format(new Date(val), 'MMM d, yyyy')}</span>;
  if (prop.type === 'checkbox') {
    return (
      <div className={cn(`w-4 h-4 rounded border-2 flex items-center justify-center ${val ? 'bg-accent border-accent-border' : 'border-line-medium'}`)}>
        {val && <span className={cn("text-ink-inverse text-[10px]")}>✓</span>}
      </div>
    );
  }
  if (prop.type === 'number') return <span className={cn("text-xs text-ink-secondary tabular-nums")}>{Number(val).toLocaleString()}</span>;
  if (prop.type === 'user' || prop.type === 'person') {
    return (
      <div className={cn("flex items-center gap-1.5")}>
        <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[10px] font-bold shrink-0")}>
          {String(val).charAt(0).toUpperCase()}
        </div>
        <span className={cn("text-xs text-ink-body-light truncate")}>{val}</span>
      </div>
    );
  }
  if (prop.type === 'url') return <a href={val} className={cn(`text-xs text-accent-text-soft hover:underline ${wrapContent ? 'break-all' : 'truncate'}`)} onClick={e => e.stopPropagation()}>{val}</a>;
  return <span className={cn(`text-xs text-ink-body ${wrapContent ? 'break-words' : 'truncate'}`)}>{String(val)}</span>;
}
