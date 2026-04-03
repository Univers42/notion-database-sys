/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PropertyRow.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:36 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 15:07:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// PropertyRow — renders a single property label + editor in the page modal
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { PropIcon } from '../constants/propertyIcons';
import type { SchemaProperty, DatabaseSchema, Page } from '../types/database';
import {
  ReadOnlyText, ReadOnlyTime, TextEditor, NumberEditor, SelectEditor,
  MultiSelectEditor, CheckboxEditor, DateEditor, PlaceEditor,
} from './PropertyRowEditors';
import { cn } from '../utils/cn';

// ─── Main component ─────────────────────────────────────────────────────────

export function PropertyRow({ prop, page, pageId, database: _database }: Readonly<{
  prop: SchemaProperty;
  page: Page;
  pageId: string;
  database: DatabaseSchema;
}>) {
  const { updatePageProperty } = useDatabaseStore.getState();
  const val = page.properties[prop.id];
  const update = (v: unknown) => updatePageProperty(pageId, prop.id, v);

  const editor = renderPropertyEditor(prop, val, page, update);

  return (
    <div className={cn("flex items-center gap-3 py-1.5 group hover:bg-hover-surface -mx-3 px-3 rounded-lg transition-colors")}>
      <div className={cn("flex items-center gap-2 w-36 shrink-0")}>
        <span className={cn("text-ink-muted")}><PropIcon type={prop.type} className={cn("w-3.5 h-3.5")} /></span>
        <span className={cn("text-sm text-ink-secondary truncate")}>{prop.name}</span>
      </div>
      {editor}
    </div>
  );
}

// ─── Editor dispatcher ──────────────────────────────────────────────────────

function renderPropertyEditor(
  prop: SchemaProperty,
  val: unknown,
  page: Page,
  update: (v: unknown) => void,
): React.ReactNode {
  switch (prop.type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      return <TextEditor value={val as string} onChange={update} type={prop.type} />;
    case 'number':
      return <NumberEditor value={val as number | null} onChange={update} />;
    case 'select':
    case 'status':
      return <SelectEditor value={val as string} options={prop.options ?? []} onChange={update} />;
    case 'multi_select':
      return <MultiSelectEditor value={val as string[]} options={(prop.options ?? []) as { id: string; value: string; color: string }[]} onChange={update} />;
    case 'date':
      return <DateEditor value={val as string} onChange={update} />;
    case 'checkbox':
      return <CheckboxEditor value={!!val} onChange={update} />;
    case 'user':
    case 'person':
      return <TextEditor value={val as string} onChange={update} />;
    case 'place':
      return <PlaceEditor value={val} onChange={update} />;
    case 'id':
      return <ReadOnlyText value={val} />;
    case 'files_media':
      return <span className={cn("text-sm text-ink-muted italic px-2")}>{Array.isArray(val) && val.length > 0 ? `${val.length} file(s)` : 'No files'}</span>;
    case 'button':
      return (
        <button className={cn("px-3 py-1 bg-surface-tertiary hover:bg-hover-surface3 text-xs font-medium text-ink-body rounded-md transition-colors")}>
          {prop.buttonConfig?.label || 'Click'}
        </button>
      );
    case 'created_time':
      return <ReadOnlyTime iso={page.createdAt} />;
    case 'last_edited_time':
      return <ReadOnlyTime iso={page.updatedAt} />;
    case 'created_by':
      return <ReadOnlyText value={page.createdBy} />;
    case 'last_edited_by':
      return <ReadOnlyText value={page.lastEditedBy} />;
    default:
      return <span className={cn("text-sm text-ink-muted px-2")}>—</span>;
  }
}
