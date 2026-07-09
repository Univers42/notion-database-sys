/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CardPropertyValue.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 10:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 10:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Paperclip } from 'lucide-react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { safeDateFormat } from '../../../utils/format';
import { safeString } from '../../../utils/safeString';
import type { Page, SchemaProperty, PropertyValue } from '../../../types/database';
import { cn } from '../../../utils/cn';

/** True when the property has something worth rendering on a card.
 *  Formula/rollup are computed, so they count even with no stored value. */
export function hasCardValue(prop: SchemaProperty, val: PropertyValue): boolean {
  if (prop.type === 'formula') return Boolean(prop.formulaConfig?.expression);
  if (prop.type === 'rollup') return true;
  return !(val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0));
}

function OptionChip({ prop, id }: Readonly<{ prop: SchemaProperty; id: PropertyValue }>) {
  const opt = prop.options?.find(o => o.id === id);
  // Unknown option id (live-mounted data): still show it, neutral chip.
  const label = opt ? opt.value : safeString(id);
  const color = opt?.color ?? 'bg-surface-tertiary text-ink-secondary';
  return <span className={cn(`inline-block max-w-full truncate px-1.5 py-0.5 rounded text-xs font-medium ${color}`)}>{label}</span>;
}

function PersonBadge({ val }: Readonly<{ val: PropertyValue }>) {
  const name = safeString(val);
  return (
    <span className={cn('inline-flex items-center gap-1 min-w-0')}>
      <span className={cn('w-4 h-4 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[8px] font-bold shrink-0')}>
        {name.charAt(0).toUpperCase() || '?'}
      </span>
      <span className={cn('text-xs text-ink-body-light truncate')}>{name}</span>
    </span>
  );
}

function ComputedValue({ prop, page, databaseId }: Readonly<{ prop: SchemaProperty; page: Page; databaseId: string }>) {
  const storeApi = useStoreApi();
  const { resolveFormula, resolveRollup } = storeApi.getState();
  const out = prop.type === 'formula'
    ? (prop.formulaConfig?.expression ? resolveFormula(databaseId, page, prop.formulaConfig.expression) : null)
    : resolveRollup(databaseId, page, prop.id);
  const text = safeString(out);
  if (!text) return null;
  return <span className={cn('text-xs text-ink-secondary tabular-nums truncate')}>{text}</span>;
}

interface CardPropertyValueProps {
  prop: SchemaProperty;
  val: PropertyValue;
  page: Page;
  databaseId: string;
  /** wrap=false truncates single-line (Notion "wrap all properties" off). */
  wrap: boolean;
}

/** Compact single-value renderer for cards (board/gallery/list). Every
 *  property type renders SOMETHING — an enabled property is never invisible,
 *  and unknown/odd values degrade to safe text instead of throwing. */
export function CardPropertyValue({ prop, val, page, databaseId, wrap }: Readonly<CardPropertyValueProps>) {
  const textCls = wrap ? 'break-words' : 'truncate';

  switch (prop.type) {
    case 'select':
    case 'status':
      return <OptionChip prop={prop} id={val} />;
    case 'multi_select': {
      const ids = Array.isArray(val) ? val : [val];
      return (
        <span className={cn(`flex gap-1 min-w-0 ${wrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`)}>
          {ids.map((id, i) => <OptionChip key={`${safeString(id)}-${i}`} prop={prop} id={id} />)}
        </span>
      );
    }
    case 'date':
    case 'due_date':
      return <span className={cn('text-xs text-ink-secondary')}>{safeDateFormat(val, 'MMM d, yyyy') ?? safeString(val)}</span>;
    case 'created_time':
    case 'last_edited_time':
      return <span className={cn('text-xs text-ink-muted')}>{safeDateFormat(val, 'MMM d, yyyy') ?? safeString(val)}</span>;
    case 'user':
    case 'person':
    case 'assigned_to':
    case 'created_by':
    case 'last_edited_by':
      return <PersonBadge val={val} />;
    case 'checkbox':
      return (
        <span className={cn('inline-flex items-center gap-1.5')}>
          <span className={cn(`w-3.5 h-3.5 rounded border shrink-0 ${val ? 'bg-accent border-accent-border' : 'border-line-medium'} flex items-center justify-center`)}>
            {val ? <span className={cn('text-ink-inverse text-[8px]')}>✓</span> : null}
          </span>
          <span className={cn('text-xs text-ink-secondary')}>{prop.name}</span>
        </span>
      );
    case 'number': {
      const n = Number(val);
      return <span className={cn('text-xs text-ink-secondary tabular-nums')}>{Number.isFinite(n) ? n.toLocaleString() : safeString(val)}</span>;
    }
    case 'url':
      return <span className={cn(`text-xs text-accent-text-soft underline decoration-line-medium underline-offset-2 ${textCls} min-w-0`)}>{safeString(val)}</span>;
    case 'files_media': {
      const count = Array.isArray(val) ? val.length : 1;
      return (
        <span className={cn('inline-flex items-center gap-1 text-xs text-ink-secondary')}>
          <Paperclip className={cn('w-3 h-3 shrink-0 text-ink-muted')} />
          {count} {count === 1 ? 'file' : 'files'}
        </span>
      );
    }
    case 'relation': {
      const count = Array.isArray(val) ? val.length : 1;
      return <span className={cn('text-xs text-ink-secondary')}>{count} linked</span>;
    }
    case 'formula':
    case 'rollup':
      return <ComputedValue prop={prop} page={page} databaseId={databaseId} />;
    case 'id':
      return <span className={cn('text-xs font-mono text-ink-muted truncate')}>{safeString(val)}</span>;
    // text, email, phone, place, button and anything future: plain safe text.
    default:
      return <span className={cn(`text-xs text-ink-secondary ${textCls} min-w-0`)}>{safeString(val)}</span>;
  }
}
