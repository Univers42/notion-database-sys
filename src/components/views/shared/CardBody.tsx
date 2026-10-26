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

import React, { useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import type { Page, SchemaProperty } from '../../../types/database';
import { cn } from '../../../utils/cn';
import { CardAddProperty } from './CardAddProperty';
import { CardCell, isCardEditable } from './CardCell';
import { CardPropertyValue, hasCardValue } from './CardPropertyValue';

/** Values that read on their own (a coloured chip, a person) flow in one row;
 *  everything else needs its property name beside it to mean anything. */
const CHIP_TYPES = new Set(['select', 'status', 'multi_select', 'user', 'person', 'assigned_to', 'created_by', 'last_edited_by']);

/** Board and gallery card body: an ID kicker, the title (two lines, not an
 *  ellipsis), then chips and labeled values, each editable in place.
 *
 *  The title button's ::after stretches over the whole card (the parent is
 *  `relative` and carries `group/card`), so a click anywhere opens the page
 *  while the values above it (z-[1]) stay their own buttons — no button
 *  nested in a button. */
export function CardBody({ page, title, icon, props, databaseId, wrap, className, titleClass, onOpen, onEditingChange }: Readonly<{
  page: Page;
  title: string;
  icon?: string;
  props: SchemaProperty[];
  databaseId: string;
  wrap: boolean;
  className: string;
  titleClass: string;
  onOpen: () => void;
  /** A board card stops being draggable while a value is being edited. */
  onEditingChange?: (editing: boolean) => void;
}>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [editingPropId, setEditingPropId] = useState<string | null>(null);
  const titleProp = useDatabaseStore(s => {
    const db = s.databases[databaseId];
    return db ? db.properties[db.titlePropertyId] : undefined;
  });
  const edit = (propId: string | null) => {
    setEditingPropId(propId);
    onEditingChange?.(propId !== null);
  };

  const shown = props.filter(p => p.id === editingPropId || hasCardValue(p, page.properties[p.id]));
  const emptyProps = props.filter(p => !shown.includes(p) && isCardEditable(p));
  const idProps = shown.filter(p => p.type === 'id');
  const chipProps = shown.filter(p => CHIP_TYPES.has(p.type));
  const valueProps = shown.filter(p => p.type !== 'id' && !CHIP_TYPES.has(p.type));
  const cell = (prop: SchemaProperty, cellClass = '') => (
    <CardCell key={prop.id} prop={prop} page={page} databaseId={databaseId} wrap={wrap}
      editing={editingPropId === prop.id} onEdit={edit} cardRef={cardRef} className={cellClass}>
      {hasCardValue(prop, page.properties[prop.id])
        ? <CardPropertyValue prop={prop} val={page.properties[prop.id]} page={page} databaseId={databaseId} wrap={wrap} />
        : <span className={cn('text-xs text-ink-muted')}>Empty</span>}
    </CardCell>
  );
  const editingTitle = Boolean(titleProp) && editingPropId === titleProp?.id;

  return (
    <div ref={cardRef} tabIndex={-1} className={cn(`flex flex-col gap-2 min-w-0 outline-none ${className}`)}>
      <div className={cn('flex flex-col gap-0.5 min-w-0')}>
        {idProps.length > 0 && (
          <div className={cn('flex items-center gap-2 min-w-0')} data-testid="card-id">
            {idProps.map(prop => cell(prop))}
          </div>
        )}
        <div className={cn(`flex items-start gap-1 min-w-0 font-semibold ${titleClass} text-ink leading-snug`)}>
          {editingTitle && titleProp ? cell(titleProp, 'flex-1') : (
            <button type="button" onClick={onOpen}
              className={cn(`flex-1 min-w-0 text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring-accent-muted ${wrap ? 'break-words' : 'line-clamp-2'}`)}>
              {icon && <span className={cn('mr-1')}>{icon}</span>}
              {title || <span className={cn('text-ink-muted font-medium')}>Untitled</span>}
            </button>
          )}
          {titleProp && !editingTitle && (
            <button type="button" onClick={() => edit(titleProp.id)} aria-label="Rename"
              className={cn('relative z-[1] shrink-0 rounded p-1 -m-0.5 text-ink-muted hover:text-ink-secondary hover:bg-hover-surface opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring-accent-muted outline-none transition-opacity [@media(hover:none)]:opacity-100')}>
              <Pencil className={cn('w-3 h-3')} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {(chipProps.length > 0 || valueProps.length > 0) && (
        <div className={cn('flex flex-col gap-1.5 min-w-0')} data-testid="card-props">
          {chipProps.length > 0 && (
            <div className={cn('flex flex-wrap items-center gap-1 min-w-0')}>
              {chipProps.map(prop => cell(prop))}
            </div>
          )}
          {valueProps.map(prop => (
            <div key={prop.id} className={cn('flex items-baseline gap-2 min-w-0')}>
              <span className={cn('w-[38%] shrink-0 truncate text-[11px] text-ink-muted')}>{prop.name}</span>
              {cell(prop, 'flex-1')}
            </div>
          ))}
        </div>
      )}
      <CardAddProperty emptyProps={emptyProps} databaseId={databaseId} onEdit={edit} />
    </div>
  );
}
