/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CardBody.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Page, SchemaProperty } from '../../../types/database';
import { cn } from '../../../utils/cn';
import { CardPropertyValue, hasCardValue } from './CardPropertyValue';

/** Values that read on their own (a coloured chip, a person) flow in one row;
 *  everything else needs its property name beside it to mean anything. */
const CHIP_TYPES = new Set(['select', 'status', 'multi_select', 'user', 'person', 'assigned_to', 'created_by', 'last_edited_by']);

/** Board and gallery card body: an ID kicker, the title (two lines, not an
 *  ellipsis), then chips and labeled values. The parent carries `group/card`. */
export function CardBody({ page, title, icon, props, databaseId, wrap, className, titleClass }: Readonly<{
  page: Page;
  title: string;
  icon?: string;
  props: SchemaProperty[];
  databaseId: string;
  wrap: boolean;
  className: string;
  titleClass: string;
}>) {
  const shown = props.filter(p => hasCardValue(p, page.properties[p.id]));
  const idProps = shown.filter(p => p.type === 'id');
  const chipProps = shown.filter(p => CHIP_TYPES.has(p.type));
  const valueProps = shown.filter(p => p.type !== 'id' && !CHIP_TYPES.has(p.type));
  const value = (prop: SchemaProperty) => (
    <CardPropertyValue prop={prop} val={page.properties[prop.id]} page={page} databaseId={databaseId} wrap={wrap} />
  );

  return (
    <div className={cn(`relative flex flex-col gap-2 min-w-0 ${className}`)}>
      <span
        className={cn('absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-medium text-accent-text-soft bg-accent-soft px-1 py-0.5 rounded opacity-0 group-hover/card:opacity-100 transition-opacity')}
        aria-hidden="true">
        <ArrowUpRight className={cn('w-2.5 h-2.5')} /> Open
      </span>
      <div className={cn('flex flex-col gap-0.5 min-w-0')}>
        {idProps.length > 0 && (
          <div className={cn('flex items-center gap-2 min-w-0')} data-testid="card-id">
            {idProps.map(prop => <React.Fragment key={prop.id}>{value(prop)}</React.Fragment>)}
          </div>
        )}
        <div className={cn(`font-semibold ${titleClass} text-ink min-w-0 leading-snug ${wrap ? 'break-words' : 'line-clamp-2'}`)}>
          {icon && <span className={cn('mr-1')}>{icon}</span>}
          {title || <span className={cn('text-ink-muted font-medium')}>Untitled</span>}
        </div>
      </div>
      {(chipProps.length > 0 || valueProps.length > 0) && (
        <div className={cn('flex flex-col gap-1.5 min-w-0')} data-testid="card-props">
          {chipProps.length > 0 && (
            <div className={cn('flex flex-wrap items-center gap-1 min-w-0')}>
              {chipProps.map(prop => (
                <span key={prop.id} title={prop.name} className={cn('inline-flex min-w-0 max-w-full')}>{value(prop)}</span>
              ))}
            </div>
          )}
          {valueProps.map(prop => (
            <div key={prop.id} className={cn('flex items-baseline gap-2 min-w-0')}>
              <span className={cn('w-[38%] shrink-0 truncate text-[11px] text-ink-muted')}>{prop.name}</span>
              {value(prop)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
