/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GalleryViewHelpers.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:38:19 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { format } from 'date-fns';
import type { SchemaProperty, PropertyValue } from '../../../types/database';
import { cn } from '../../../utils/cn';
import { safeString } from '../../../utils/safeString';
export { CARD_COVER_GRADIENTS as coverColors } from '../../../utils/color';

function renderGallerySelectValue(prop: SchemaProperty, val: PropertyValue) {
  const opt = prop.options?.find(o => o.id === val);
  return opt ? <span className={cn(`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`)}>{opt.value}</span> : null;
}

function renderGalleryMultiSelect(prop: SchemaProperty, val: PropertyValue, wrapContent: boolean) {
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

function renderGalleryCheckbox(val: PropertyValue) {
  return (
    <div className={cn(`w-4 h-4 rounded border-2 flex items-center justify-center ${val ? 'bg-accent border-accent-border' : 'border-line-medium'}`)}>
      {val && <span className={cn("text-ink-inverse text-[10px]")}>✓</span>}
    </div>
  );
}

function renderGalleryPerson(val: PropertyValue) {
  return (
    <div className={cn("flex items-center gap-1.5")}>
      <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[10px] font-bold shrink-0")}>
        {safeString(val).charAt(0).toUpperCase()}
      </div>
      <span className={cn("text-xs text-ink-body-light truncate")}>{safeString(val)}</span>
    </div>
  );
}

/** Renders a property value as a compact inline element for gallery cards. */
export function renderPropertyValue(prop: SchemaProperty, val: PropertyValue, wrapContent: boolean) {
  if (val === undefined || val === null || val === '') return null;
  switch (prop.type) {
    case 'select':
    case 'status':       return renderGallerySelectValue(prop, val);
    case 'multi_select': return renderGalleryMultiSelect(prop, val, wrapContent);
    case 'date':         return <span className={cn("text-xs text-ink-secondary")}>{format(new Date(val), 'MMM d, yyyy')}</span>;
    case 'checkbox':     return renderGalleryCheckbox(val);
    case 'number':       return <span className={cn("text-xs text-ink-secondary tabular-nums")}>{Number(val).toLocaleString()}</span>;
    case 'user':
    case 'person':       return renderGalleryPerson(val);
    case 'url':          return <a href={val} className={cn(`text-xs text-accent-text-soft hover:underline ${wrapContent ? 'break-all' : 'truncate'}`)} onClick={e => e.stopPropagation()}>{val}</a>;
    default:             return <span className={cn(`text-xs text-ink-body ${wrapContent ? 'break-words' : 'truncate'}`)}>{safeString(val)}</span>;
  }
}
