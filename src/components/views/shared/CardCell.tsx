/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CardCell.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import type { Page, PropertyValue, SchemaProperty } from '../../../types/database';
import { cn } from '../../../utils/cn';
import { renderCellContent } from '../table/CellRenderer';

/** Types the table edits through renderCellContent. Computed and system
 *  values (formula, rollup, created_*, id, button, assigned_to) are not here:
 *  a click on them falls through to the card and opens the page. */
const EDITABLE_TYPES = new Set([
  'title', 'text', 'number', 'select', 'status', 'multi_select', 'date', 'person', 'user',
  'email', 'url', 'phone', 'place', 'files_media', 'relation', 'due_date', 'custom',
]);
/** Editors that replace the value in place; the others are popovers that open
 *  under the value and leave it showing. */
const INLINE_TYPES = new Set(['title', 'text', 'number', 'email', 'url', 'phone', 'custom']);

export function isCardEditable(prop: SchemaProperty): boolean {
  if (prop.type === 'checkbox') return true;
  return EDITABLE_TYPES.has(prop.type) && !(prop.type === 'select' && prop.autofill);
}

const noop = () => {};

/** One value on a board or gallery card. Clicking it edits it with the table's
 *  own editor (anchored on this cell); a checkbox toggles in place. */
export function CardCell({ prop, page, databaseId, wrap, editing, onEdit, cardRef, className = '', children }: Readonly<{
  prop: SchemaProperty;
  page: Page;
  databaseId: string;
  wrap: boolean;
  editing: boolean;
  onEdit: (propId: string | null) => void;
  cardRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
}>) {
  const storeApi = useStoreApi();
  const value = page.properties[prop.id] as PropertyValue;
  if (!isCardEditable(prop)) return <div className={cn(`min-w-0 pointer-events-none ${className}`)}>{children}</div>;

  const editor = editing && renderCellContent({
    prop, page, value, isEditing: true, wrapContent: wrap, databaseId,
    onUpdate: (pageId, propId, v) => storeApi.getState().updatePageProperty(pageId, propId, v),
    onStopEditing: () => onEdit(null),
    onOpenPage: noop, onFormulaEdit: noop, onPropertyConfig: noop,
    tableRef: cardRef, storeApi,
  });
  const inline = editing && INLINE_TYPES.has(prop.type);
  const start = () => {
    if (prop.type === 'checkbox') storeApi.getState().updatePageProperty(page.id, prop.id, !value);
    else onEdit(prop.id);
  };

  // The wrapper spans its row for the editor's anchor, but only the value
  // itself takes clicks; the rest of the row still opens the page. The value
  // hovers as a padded chip under a pointer: the card around it shows a grab
  // cursor, and the old text-hugging bg-subtle tint read as no change at all.
  // An inline editor gets the table's editing frame, its only sign of focus.
  const frame = inline ? 'rounded ring-2 ring-ring-success bg-surface-primary -mx-1 px-1' : '';
  return (
    <div data-cell-anchor className={cn(`relative z-[1] min-w-0 max-w-full pointer-events-none [&>*]:pointer-events-auto ${frame} ${className}`)}>
      {inline ? editor : (
        <button type="button" onClick={start} aria-label={`Edit ${prop.name}`} title={prop.name}
          className={cn('-mx-1 -my-0.5 flex max-w-[calc(100%+0.5rem)] min-w-0 cursor-pointer items-center rounded px-1 py-0.5 text-left hover:bg-hover-surface2 focus-visible:ring-2 focus-visible:ring-ring-accent-muted outline-none transition-colors')}>
          {children}
        </button>
      )}
      {!inline && editor}
    </div>
  );
}
